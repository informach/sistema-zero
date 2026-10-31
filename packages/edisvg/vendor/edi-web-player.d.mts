export * from "./edi-web-data.mjs";
export type * from "./edi-web-types.js";
import type { WebAnimationHandle, WebAnimationOptions } from "./edi-web-types.js";
export declare function mountWebAnimation(root: SVGSVGElement, input: unknown, options?: WebAnimationOptions): Promise<WebAnimationHandle>;
