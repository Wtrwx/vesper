import ObjC from "frida-objc-bridge";
import { Args, ObjectLimitError, array, nullableString, objectId } from "./common.js";

const present = (o: any): boolean => !!o && !o.handle?.isNull();
const has = (o: any, selector: string): boolean => present(o) && !!o.respondsToSelector_(ObjC.selector(selector));
export const isView = (o: any): boolean => present(o) && !!o.isKindOfClass_(ObjC.classes.UIView);
const box = (r: any): Args => ({ x: Number(r[0][0]), y: Number(r[0][1]), width: Number(r[1][0]), height: Number(r[1][1]) });
export const isElement = (o: any): boolean => !isView(o) && has(o, "accessibilityFrame");

export function frame(o: any): Args {
  if (has(o, "accessibilityFrame")) {
    const bounds = box(o.accessibilityFrame());
    if (!isView(o) || bounds.width > 0 && bounds.height > 0) return bounds;
  }
  return box(o.convertRect_toView_(o.bounds(), NULL));
}
function children(o: any, maximum: number): any[] {
  let result: any[] = [];
  if (has(o, "accessibilityElements")) result = array(o.accessibilityElements(), maximum);
  if (!result.length && has(o, "accessibilityElementCount") && has(o, "accessibilityElementAtIndex:")) {
    const count = Number(o.accessibilityElementCount());
    if (Number.isSafeInteger(count) && count > 0 && count < 100000) {
      for (let i = 0; i < Math.min(count, maximum); i++) {
        const child = o.accessibilityElementAtIndex_(i); if (present(child)) result.push(child);
      }
    }
  }
  if (!result.length && isView(o)) result = array(o.subviews(), maximum);
  return result;
}
function traits(o: any): number { return has(o, "accessibilityTraits") ? Number(o.accessibilityTraits()) : 0; }
export function describe(o: any, args: Args, knownFrame?: Args): Args {
  const fields = new Set(args.fields || ["view_id", "class_name", "screen_frame", "frame", "accessibility_identifier", "interactive", "accessibility_traits"]);
  const result: Args = { view_id: objectId(o), backend: "accessibility" };
  const mask = ["interactive", "accessibility_traits", "accessibility_actions"].some(f => fields.has(f)) ? traits(o) : 0;
  const bounds = fields.has("frame") || fields.has("screen_frame") ? knownFrame || frame(o) : null;
  if (fields.has("class_name")) result.class_name = o.$className;
  if (fields.has("frame")) result.frame = bounds;
  if (fields.has("screen_frame")) result.screen_frame = bounds;
  if (fields.has("accessibility_identifier")) result.accessibility_identifier = has(o, "accessibilityIdentifier") ? nullableString(o.accessibilityIdentifier()) : null;
  if (fields.has("interactive")) result.interactive = !(mask & 256) && !!(mask & (1 | 2 | 32 | 1024 | 4096));
  if (fields.has("accessibility_traits")) result.accessibility_traits = String(mask);
  if (fields.has("accessibility_actions")) result.accessibility_actions = ["activate", ...(mask & 4096 ? ["increment", "decrement"] : [])];
  if (args.include_text && (!args.fields || fields.has("text") || fields.has("accessibility_value"))) {
    const secure = secureText(o);
    if (!args.fields || fields.has("text")) result.text = describeText(o);
    if (!args.fields || fields.has("accessibility_value")) result.accessibility_value = secure ? "[REDACTED]" : (has(o, "accessibilityValue") ? nullableString(o.accessibilityValue(), 128) : null);
  }
  return result;
}
function ancestry(o: any): { hidden: boolean; alpha: number } {
  let hidden = false, alpha = 1, current = isView(o) ? o.superview() : null;
  for (let i = 0; i < 128 && present(current); i++, current = current.superview()) {
    hidden ||= !!current.isHidden(); alpha *= Number(current.alpha());
  }
  return { hidden, alpha };
}
export function snapshot(args: Args, roots: any[], parent: string | null = null, baseDepth = 0, skipRoots = false): Args {
  const started = Date.now();
  const maximum = args.max_nodes ?? 1000, depthLimit = args.depth ?? 8;
  const queue = roots.map(o => ({ o, depth: baseDepth, parent, ...ancestry(o) }));
  const seen = new Set<string>(), views: Args[] = [];
  let index = 0, truncated = false, objectLimit = false;
  for (; index < queue.length && seen.size < maximum; index++) {
    const { o, depth, parent, hidden, alpha } = queue[index];
    if (!present(o) || seen.has(o.handle.toString())) continue;
    seen.add(o.handle.toString());
    const view = isView(o), nextAlpha = alpha * (view ? Number(o.alpha()) : 1);
    const nextHidden = hidden || (view && !!o.isHidden());
    if ((args.visible_only ?? true) && (nextHidden || nextAlpha <= .01)) continue;
    const identifier = has(o, "accessibilityIdentifier") ? nullableString(o.accessibilityIdentifier()) : null;
    const isAccessible = has(o, "isAccessibilityElement") && !!o.isAccessibilityElement();
    const matches = (!args.class_name || o.$className === args.class_name) && (!args.accessibility_identifier || identifier === args.accessibility_identifier) &&
      (args.text == null || String(describeText(o)).toLowerCase().includes(String(args.text).toLowerCase()));
    let selectedParent = parent;
    if ((!skipRoots || depth > baseDepth) && matches && (!(args.controls_only ?? true) || isAccessible || isElement(o))) {
      const bounds = frame(o), screen = box(ObjC.classes.UIScreen.mainScreen().bounds());
      const visible = bounds.width > 0 && bounds.height > 0 && bounds.x < screen.x + screen.width && bounds.y < screen.y + screen.height && bounds.x + bounds.width > screen.x && bounds.y + bounds.height > screen.y;
      if (!(args.visible_only ?? true) || visible) {
        try {
          const row = describe(o, args, bounds);
          views.push({ ...row, parent_id: parent, depth }); selectedParent = row.view_id;
        } catch (error) {
          if (!(error instanceof ObjectLimitError)) throw error;
          objectLimit = true; break;
        }
      }
    }
    if (has(o, "accessibilityElementsHidden") && o.accessibilityElementsHidden()) continue;
    const nested = children(o, maximum + 1);
    if (depth >= depthLimit) { if (nested.length) truncated = true; continue; }
    for (const child of nested) {
      if (queue.length >= maximum * 2) { truncated = true; break; }
      queue.push({ o: child, depth: depth + 1, parent: selectedParent, hidden: nextHidden, alpha: nextAlpha });
    }
  }
  return { views, backend: "accessibility", total_visited: seen.size, truncated: truncated || index < queue.length,
    object_limit_reached: objectLimit, captured_at: new Date(started).toISOString(), collection_ms: Date.now() - started,
    coordinate_space: "screen UIKit points", session_scoped: true, observed: true };
}
function describeText(o: any): string {
  return secureText(o) ? "[REDACTED]" : (has(o, "accessibilityLabel") ? nullableString(o.accessibilityLabel()) || "" : "");
}
function secureText(o: any): boolean {
  const identifier = has(o, "accessibilityIdentifier") ? nullableString(o.accessibilityIdentifier()) || "" : "";
  return /password|passwd|secret|token|credential|private.?key/i.test(identifier) || (has(o, "isSecureTextEntry") && !!o.isSecureTextEntry());
}
export function act(o: any, operation: string, direction?: string): Args {
  const bounds = frame(o);
  if (bounds.width <= 0 || bounds.height <= 0 || traits(o) & 256) throw new Error("Accessibility target is unavailable or disabled");
  if (operation === "activate") {
    if (!has(o, "accessibilityActivate") || !o.accessibilityActivate()) throw new Error("Accessibility activation was not handled; use the touch backend if needed");
  } else if (operation === "increment" || operation === "decrement") {
    if (!(traits(o) & 4096)) throw new Error("Accessibility target is not adjustable");
    o[operation === "increment" ? "accessibilityIncrement" : "accessibilityDecrement"]();
  } else if (operation === "escape") {
    if (!has(o, "accessibilityPerformEscape") || !o.accessibilityPerformEscape()) throw new Error("Accessibility escape was not handled");
  } else if (operation === "scroll") {
    const directions: Args = { right: 1, left: 2, up: 3, down: 4, next: 5, previous: 6 };
    if (!has(o, "accessibilityScroll:") || !o.accessibilityScroll_(directions[direction || "down"])) throw new Error("Accessibility scroll was not handled");
  } else throw new Error("Unsupported accessibility operation");
  return { action: operation, method: "accessibility_" + operation, view_id: objectId(o), performed: true };
}
