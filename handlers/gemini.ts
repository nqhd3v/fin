"use server";

import axios from "axios";

// Gemini free tier: gemini-2.5-flash is the stable vision-capable model.
// Override with GEMINI_MODEL if you have access to something else.
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const $gemini = axios.create({
  baseURL: "https://generativelanguage.googleapis.com",
  headers: {
    "x-goog-api-key": process.env.GEMINI_API_KEY,
    "Content-Type": "application/json",
  },
});

/** Structured data pulled from a receipt/invoice image. All fields best-effort;
 *  the UI shows this as an editable preview before anything is saved. */
export interface ParsedInvoice {
  /** Grand total actually paid, in the smallest sensible whole unit (e.g. VND). */
  amount: number | null;
  /** Merchant / store name, if printed. */
  merchant: string | null;
  /** Short human description ("Breakfast at <merchant>"). */
  description: string | null;
  /** ISO date (YYYY-MM-DD) on the receipt, if present. */
  date: string | null;
  /** ESSENTIAL for food/transport/utilities, INCIDENTAL for the rest. */
  category: "ESSENTIAL" | "INCIDENTAL" | null;
  /** Currency code if identifiable (VND, USD…). */
  currency: string | null;
  /** Line items, when legible. */
  items: { name: string; amount: number | null }[];
}

// JSON schema handed to Gemini so it returns parseable structured output
// instead of prose. Mirrors ParsedInvoice.
const responseSchema = {
  type: "object",
  properties: {
    amount: { type: "number", nullable: true },
    merchant: { type: "string", nullable: true },
    description: { type: "string", nullable: true },
    date: { type: "string", nullable: true },
    category: { type: "string", enum: ["ESSENTIAL", "INCIDENTAL"], nullable: true },
    currency: { type: "string", nullable: true },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          amount: { type: "number", nullable: true },
        },
        required: ["name"],
      },
    },
  },
  required: ["amount", "description"],
};

const PROMPT = [
  "You are reading a photo of a store receipt or invoice.",
  "Extract the payment details. Rules:",
  "- amount = the grand total actually paid (after tax/discount), as a plain",
  "  number with no thousands separators or currency symbol.",
  "- If the receipt is in VND (đ, 'VND', or large round numbers), keep the whole",
  "  number (e.g. 45000, not 45).",
  "- description = a short natural label a person would recognize, e.g.",
  "  'Breakfast at <merchant>' or the main item.",
  "- date = ISO YYYY-MM-DD if a date is printed, else null.",
  "- category = ESSENTIAL for food, groceries, transport, utilities, health;",
  "  INCIDENTAL for anything discretionary. null if unsure.",
  "- items = each line item with its price when legible.",
  "Return null for any field you cannot read confidently.",
].join("\n");

/**
 * Send an invoice image (base64) to Gemini and get structured payment data.
 * Uses inline_data (kept under the 20MB request cap — receipts are small).
 */
export const parseInvoice = async (
  base64: string,
  mimeType: string,
): Promise<{ ok: true; data: ParsedInvoice } | { ok: false; errorMessage: string }> => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return { ok: false, errorMessage: "GEMINI_API_KEY is not set" };
    }
    const res = await $gemini.post(
      `/v1beta/models/${MODEL}:generateContent`,
      {
        contents: [
          {
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0,
        },
      },
    );

    const text: string | undefined =
      res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return { ok: false, errorMessage: "Gemini returned no data" };
    }

    const data = JSON.parse(text) as ParsedInvoice;
    return { ok: true, data };
  } catch (e) {
    // Surface Gemini's own error message when present (bad key, quota, model).
    const msg =
      (axios.isAxiosError(e) &&
        (e.response?.data?.error?.message as string | undefined)) ||
      (e as Error).message;
    console.error("Error parsing invoice with Gemini:", msg);
    return { ok: false, errorMessage: msg };
  }
};
