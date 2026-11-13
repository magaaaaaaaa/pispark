import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { DISCLAIMER, PRICE_PER_HOUR_USD, TRIAL_MINUTES } from "@/lib/config";
import type { Block, Slide } from "./schema";

/** Instagram's portrait format. */
export const SLIDE_WIDTH = 1080;
export const SLIDE_HEIGHT = 1350;

const INK = "#14213d";
const SOFT = "#46557a";
const PAPER = "#f2f6fd";
const GRID = "#cfdbf0";
const PLOT = "#2f5bea";
const SPARK = "#ffb800";

const font = (file: string) => readFile(join(process.cwd(), "assets/fonts", file));
let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 700 | 800; style: "normal" | "italic" }[]> | null = null;
function loadFonts() {
  fonts ??= Promise.all([
    font("body-400.woff").then((data) => ({ name: "Body", data, weight: 400 as const, style: "normal" as const })),
    font("body-700.woff").then((data) => ({ name: "Body", data, weight: 700 as const, style: "normal" as const })),
    font("display-800.woff").then((data) => ({ name: "Display", data, weight: 800 as const, style: "normal" as const })),
    font("math-400-italic.woff").then((data) => ({ name: "Math", data, weight: 400 as const, style: "italic" as const })),
    // Last, so it only supplies the symbols the others lack (√, ≤, π, …).
    font("math-symbols.woff").then((data) => ({ name: "Symbols", data, weight: 400 as const, style: "normal" as const })),
  ]);
  return fonts;
}

const BODY = "Body, Symbols";
const MATH = "Math, Symbols";

/** Shrink type as a slide fills up, so a full slide still fits. */
function scaleFor(weight: number): number {
  if (weight <= 8) return 1.45;
  if (weight <= 12) return 1.25;
  if (weight <= 15) return 1.05;
  if (weight <= 18) return 0.92;
  return 0.82;
}

function BlockView({ block, s, dark }: { block: Block; s: number; dark: boolean }) {
  const fg = dark ? "#ffffff" : INK;
  switch (block.type) {
    case "text":
      return (
        <div style={{ display: "flex", fontFamily: BODY, fontSize: 46 * s, lineHeight: 1.35, color: fg, whiteSpace: "pre-wrap" }}>
          {block.text}
        </div>
      );
    case "math":
      return (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: `${22 * s}px ${28 * s}px`,
            borderRadius: 20,
            border: `4px solid ${dark ? "#ffffff" : INK}`,
            background: dark ? "transparent" : "#ffffff",
            fontFamily: MATH,
            fontStyle: "italic",
            fontSize: (block.text.length > 34 ? 50 : 64) * s,
            color: fg,
          }}
        >
          {block.text}
        </div>
      );
    case "choices":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 * s }}>
          {block.items.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 22 * s }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 64 * s,
                  height: 64 * s,
                  borderRadius: 999,
                  border: `4px solid ${dark ? "#ffffff" : INK}`,
                  fontFamily: BODY,
                  fontWeight: 700,
                  fontSize: 34 * s,
                  color: fg,
                }}
              >
                {"ABCD"[i]}
              </div>
              <div style={{ display: "flex", fontFamily: MATH, fontStyle: "italic", fontSize: 50 * s, color: fg }}>{item}</div>
            </div>
          ))}
        </div>
      );
    case "steps":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 * s }}>
          {block.items.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 22 * s }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  width: 56 * s,
                  height: 56 * s,
                  borderRadius: 999,
                  background: SPARK,
                  border: `4px solid ${INK}`,
                  fontFamily: BODY,
                  fontWeight: 700,
                  fontSize: 30 * s,
                  color: INK,
                }}
              >
                {i + 1}
              </div>
              <div style={{ display: "flex", flex: 1, fontFamily: BODY, fontSize: 42 * s, lineHeight: 1.35, color: fg }}>{item}</div>
            </div>
          ))}
        </div>
      );
    case "answer":
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20 * s,
            padding: `${22 * s}px ${30 * s}px`,
            borderRadius: 20,
            background: SPARK,
            border: `4px solid ${INK}`,
          }}
        >
          <div style={{ display: "flex", fontFamily: BODY, fontWeight: 700, fontSize: 36 * s, color: INK }}>Answer</div>
          <div style={{ display: "flex", fontFamily: MATH, fontStyle: "italic", fontSize: 56 * s, color: INK }}>{block.text}</div>
        </div>
      );
    case "cta":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", fontFamily: "Display", fontWeight: 800, fontSize: 104, lineHeight: 1.02, letterSpacing: -2, color: fg }}>
            Your first lesson is free.
          </div>
          <div style={{ display: "flex", fontFamily: BODY, fontSize: 46, lineHeight: 1.35, color: fg }}>
            {`${TRIAL_MINUTES} minutes, live, 1-on-1 SAT math. Then $${PRICE_PER_HOUR_USD} an hour.`}
          </div>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              marginTop: 16,
              padding: "26px 40px",
              borderRadius: 20,
              background: SPARK,
              border: `4px solid ${INK}`,
              fontFamily: BODY,
              fontWeight: 700,
              fontSize: 48,
              color: INK,
            }}
          >
            pispark.site · link in bio
          </div>
        </div>
      );
  }
}

function SlideView({ slide, index, total, weight }: { slide: Slide; index: number; total: number; weight: number }) {
  // The cover and the closing offer are dark; the working slides are light.
  const dark = index === 0 || slide.blocks.some((b) => b.type === "cta");
  const s = scaleFor(weight);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        padding: 72,
        background: dark ? INK : PAPER,
        border: dark ? "none" : `16px solid ${GRID}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "baseline", fontFamily: "Display", fontWeight: 800, fontSize: 44, color: dark ? "#ffffff" : INK }}>
          <span style={{ fontFamily: MATH, fontWeight: 400, marginRight: 2 }}>π</span>Spark
        </div>
        {total > 1 && (
          <div style={{ display: "flex", fontFamily: BODY, fontWeight: 700, fontSize: 32, color: dark ? "#ffffff" : SOFT }}>
            {`${index + 1} / ${total}`}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: 36 * s }}>
        {slide.title && (
          <div
            style={{
              display: "flex",
              fontFamily: "Display",
              fontWeight: 800,
              fontSize: (index === 0 ? 92 : 72) * s,
              lineHeight: 1.04,
              letterSpacing: -1.5,
              color: dark ? "#ffffff" : INK,
            }}
          >
            {slide.title}
          </div>
        )}
        {slide.blocks.map((b, i) => (
          <BlockView key={i} block={b} s={s} dark={dark} />
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24 }}>
        <div style={{ display: "flex", flex: 1, fontFamily: BODY, fontSize: 20, lineHeight: 1.3, color: dark ? "#c7d0e6" : SOFT }}>{DISCLAIMER}</div>
        <div style={{ display: "flex", fontFamily: BODY, fontWeight: 700, fontSize: 28, color: dark ? SPARK : PLOT }}>@pispark.math</div>
      </div>
    </div>
  );
}

/** One slide of a post as a JPEG, the format Instagram requires. */
export async function renderSlide(slide: Slide, index: number, total: number, weight: number): Promise<Buffer> {
  const image = new ImageResponse(<SlideView slide={slide} index={index} total={total} weight={weight} />, {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    fonts: await loadFonts(),
  });
  const png = Buffer.from(await image.arrayBuffer());
  return sharp(png).jpeg({ quality: 90 }).toBuffer();
}
