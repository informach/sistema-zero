import type { WebAnimationInfo } from "./edi-web-types.js";
export declare function normalizeWebAnimation(input: unknown): string;
export declare function readWebAnimation(input: unknown): WebAnimationInfo;
export declare function webAnimationPoster(input: unknown): { bytes: Uint8Array; width: number; height: number; mime: "image/png" } | null;
