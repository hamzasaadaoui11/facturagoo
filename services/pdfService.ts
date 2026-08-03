import {
  CompanySettings,
  Invoice,
  Quote,
  DeliveryNote,
  PurchaseOrder,
  Client,
  Supplier,
  LineItem,
  DocumentColumn,
  CreditNote,
} from "../types";
import { translations } from "../i18n/translations";
import html2pdf from "html2pdf.js";
import { getCurrencyByCode } from "./currencyService";

export interface DocumentData {
  id: string;
  documentId?: string;
  date: string;
  lineItems: LineItem[];
  subTotal?: number;
  vatAmount?: number;
  totalAmount?: number;
  amount?: number;
  amountPaid?: number;
  paymentAmount?: number;
  notes?: string;
  subject?: string;
  paymentMethod?: string;
  checkNumber?: string;
  bankName?: string;
  reference?: string;
  purchaseOrderNumber?: string;
  dueDate?: string;
  expiryDate?: string;
  expectedDate?: string;
  invoiceId?: string; // For Credit Notes
  discountType?: "percentage" | "fixed";
  discountValue?: number;
  showDimensions?: boolean;
}

interface PDFOptions {
  showPrices?: boolean;
  isPDFDownload?: boolean;
}

export type DocumentType =
  | "Facture"
  | "Devis"
  | "Bon de Livraison"
  | "Bon de Commande"
  | "Avoir";

// --- Utilitaires de conversion Chiffres vers Lettres (Français) ---

const UNITS = [
  "",
  "un",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
];
const TEENS = [
  "dix",
  "onze",
  "douze",
  "treize",
  "quatorze",
  "quinze",
  "seize",
  "dix-sept",
  "dix-huit",
  "dix-neuf",
];
const TENS = [
  "",
  "",
  "vingt",
  "trente",
  "quarante",
  "cinquante",
  "soixante",
  "soixante-dix",
  "quatre-vingt",
  "quatre-vingt-dix",
];

const convertGroup = (n: number, isEnd: boolean): string => {
  if (n === 0) return "";
  if (n < 10) return UNITS[n];
  if (n < 20) return TEENS[n - 10];

  const ten = Math.floor(n / 10);
  const unit = n % 10;

  if (ten === 7 || ten === 9) {
    const base = TENS[ten - 1];
    const sub = unit + 10;
    if (unit === 1 && ten === 7) return `${base}-et-onze`;
    return `${base}-${TEENS[unit]}`;
  }

  const tenString = TENS[ten];

  if (unit === 0) {
    if (ten === 8 && isEnd) return "quatre-vingts";
    return tenString;
  }

  if (unit === 1 && ten < 8) return `${tenString}-et-un`;

  return `${tenString}-${UNITS[unit]}`;
};

const numberToWordsFr = (amount: number, settings?: CompanySettings | null): string => {
  const currencyCode = settings?.defaultCurrencyCode || 'MAD';
  const currencyConfig = getCurrencyByCode(currencyCode);
  
  // Plural unit name from currency service or default
  const pluralUnit = (currencyConfig?.pluralNameFr || 'dirhams').toLowerCase();
  
  // Singular unit name (e.g. "dirham", "euro", "dinar algérien")
  let singularUnit = pluralUnit;
  if (pluralUnit === "dinars algériens") {
    singularUnit = "dinar algérien";
  } else if (pluralUnit === "livres sterling") {
    singularUnit = "livre sterling";
  } else if (pluralUnit.endsWith("s")) {
    singularUnit = pluralUnit.slice(0, -1);
  }

  // Subunit names (e.g. "centime", "centimes", "cents", "pence")
  const pluralSubunit = (currencyConfig?.subUnitNameFr || 'centimes').toLowerCase();
  let singularSubunit = pluralSubunit;
  if (pluralSubunit.endsWith("s")) {
    singularSubunit = pluralSubunit.slice(0, -1);
  }

  if (amount === 0) return `Zéro ${singularUnit}`;

  const absAmount = Math.abs(amount);
  const integerPart = Math.floor(absAmount);
  const decimalPart = Math.round((absAmount - integerPart) * 100);

  const convertIntegerGroup = (n: number, isEnd: boolean): string => {
    let str = "";
    const hundreds = Math.floor(n / 100);
    const remainder = n % 100;

    if (hundreds > 0) {
      if (hundreds === 1) str += "cent ";
      else if (remainder === 0 && isEnd) str += `${UNITS[hundreds]} cents `;
      else str += `${UNITS[hundreds]} cent `;
    }

    if (remainder > 0) {
      str += convertGroup(remainder, isEnd);
    }

    return str.trim();
  };

  const convertInteger = (n: number): string => {
    if (n === 0) return "";

    let words = "";

    // Billions
    const billions = Math.floor(n / 1000000000);
    let remainder = n % 1000000000;
    if (billions > 0) {
      words +=
        (billions === 1
          ? "un milliard"
          : `${convertIntegerGroup(billions, true)} milliards`) + " ";
    }

    // Millions
    const millions = Math.floor(remainder / 1000000);
    remainder %= 1000000;
    if (millions > 0) {
      words +=
        (millions === 1
          ? "un million"
          : `${convertIntegerGroup(millions, true)} millions`) + " ";
    }

    // Thousands
    const thousands = Math.floor(remainder / 1000);
    const remainderThousand = remainder % 1000;
    if (thousands > 0) {
      if (thousands === 1) words += "mille ";
      else words += `${convertIntegerGroup(thousands, false)} mille `;
    }

    // Hundreds
    if (remainderThousand > 0) {
      words += convertIntegerGroup(remainderThousand, true);
    }

    return words.trim();
  };

  let result = "";
  if (integerPart === 0) {
    result = `zéro ${singularUnit}`;
  } else {
    result =
      convertInteger(integerPart) +
      " " + (integerPart === 1 ? singularUnit : pluralUnit);
  }

  if (decimalPart > 0) {
    const subWord = convertIntegerGroup(decimalPart, true);
    result += ` et ${subWord} ${decimalPart > 1 ? pluralSubunit : singularSubunit}`;
  }

  return result.charAt(0).toUpperCase() + result.slice(1);
};

const DEFAULT_COLUMNS: DocumentColumn[] = [
  { id: "reference", label: "Réf", visible: false, order: 0 },
  { id: "name", label: "Désignation", visible: true, order: 1 },
  { id: "quantity", label: "Qté", visible: true, order: 2 },
  { id: "unit", label: "Unité", visible: true, order: 3 },
  { id: "unitPrice", label: "P.U. HT", visible: true, order: 4 },
  { id: "vat", label: "TVA", visible: true, order: 5 },
  { id: "total", label: "Total HT", visible: true, order: 6 },
];

export const generateDocumentHTML = (
  docType: DocumentType,
  doc: DocumentData,
  originalSettings: CompanySettings | null,
  recipient: Client | Supplier | undefined,
  options?: PDFOptions,
): string => {
  const lang = localStorage.getItem("app_language") || "fr";
  const defaultCompanyName = "";
  
  const settings = originalSettings ? {
    ...originalSettings,
    companyName: originalSettings.companyName || defaultCompanyName
  } : {
    id: "default",
    companyName: defaultCompanyName,
    primaryColor: "#10b981",
    showAmountInWords: true,
    priceDisplayMode: "HT",
    address: "",
    phone: "",
    email: "",
    website: "",
    ice: "",
    rc: "",
    fiscalId: "",
    patente: "",
    cnss: "",
    capital: "",
  } as CompanySettings;

  if (!recipient) {
    throw new Error(
      "Impossible de générer le document : Les informations du client/fournisseur sont introuvables.",
    );
  }
  const dict = (translations as any)[lang] || translations["fr"];
  const showPrices = options?.showPrices !== false;
  const showAmountInWords = settings.showAmountInWords !== false;
  const isModeTTC = settings.priceDisplayMode === "TTC";
  const calculationMode = doc.lineItems[0]?.calculationMode || "piece";
  const legacyShowDimensions =
    (doc as any).showDimensions || doc.lineItems[0]?.showDimensions;

  const isM2 =
    calculationMode === "m2" ||
    (legacyShowDimensions && calculationMode === "piece");
  const isML = calculationMode === "ml";
  const isKg = calculationMode === "kg";
  const isDays =
    doc.lineItems.some((item) => item.calculationMode === "days") ||
    doc.lineItems[0]?.calculationMode === "days";

  const getLineMultiplier = (item: any) => {
    const mode = item.calculationMode || doc.lineItems[0]?.calculationMode;

    const getDaysExtraction = (i: any) => {
      const raw = i.days || i.jours || i.jour || i.itemDays || i.nb_jours;
      const parsed = Number(raw);
      return parsed > 0 ? parsed : 1;
    };

    if (mode === "m2")
      return (Number(item.length) || 1) * (Number(item.height) || 1);
    if (mode === "ml") return Number(item.length) || 1;
    if (mode === "kg") return Number(item.weight) || 1;
    if (mode === "days") return getDaysExtraction(item);

    // Fallback for legacy items without calculationMode
    if (isM2) return (Number(item.length) || 1) * (Number(item.height) || 1);
    if (isML) return Number(item.length) || 1;
    if (isKg) return Number(item.weight) || 1;
    if (isDays) return getDaysExtraction(item);

    return 1;
  };

  const subTotal = doc.lineItems.reduce(
    (acc, item) =>
      acc + item.unitPrice * item.quantity * getLineMultiplier(item),
    0,
  );
  let discountAmount = 0;
  if (doc.discountType && doc.discountValue && doc.discountValue > 0) {
    if (doc.discountType === "percentage") {
      discountAmount = subTotal * (doc.discountValue / 100);
    } else {
      discountAmount = doc.discountValue;
    }
  }

  const subTotalAfterDiscount = subTotal - discountAmount;

  const vatAmount = doc.lineItems.reduce((acc, item) => {
    const itemTotalHT =
      item.unitPrice * item.quantity * getLineMultiplier(item);
    const itemDiscount =
      subTotal > 0 ? (itemTotalHT / subTotal) * discountAmount : 0;
    const itemBaseForVat = itemTotalHT - itemDiscount;
    return acc + itemBaseForVat * (item.vat / 100);
  }, 0);

  const totalAmount = subTotalAfterDiscount + vatAmount;

  // Extract custom labels with defaults from translations
  const labels = settings.documentLabels || {};

  // Core Labels for Totals using the specific pdf prefixes
  let txtTotalHt = labels.totalHt || dict.pdfTotalHT || "Total HT";
  let txtTotalTax = labels.totalTax || dict.pdfTotalTax || "Total TVA";
  let txtTotalNet = labels.totalNet || dict.pdfTotalNet || "Net à Payer";

  let txtAmountInWords =
    labels.amountInWordsPrefix ||
    dict.pdfAmountPrefix ||
    "Arrêté le présent document à la somme de :";
  if (docType === "Facture") {
    txtAmountInWords = txtAmountInWords.replace(
      "le présent document",
      "la présente facture",
    );
  } else {
    txtAmountInWords = txtAmountInWords.replace(
      "document",
      docType.toLowerCase(),
    );
  }
  let txtSigSender =
    labels.signatureSender || dict.pdfSigSender || "Signature Expéditeur";
  let txtSigRecipient =
    labels.signatureRecipient || dict.pdfSigRecipient || "Signature & Cachet";

  // Strict ICE -> NIF mapping for Spanish
  const taxIdLabel =
    dict.ice || (lang === "es" ? "NIF" : lang === "en" ? "Tax ID" : "ICE");

  let primaryColor = settings.primaryColor || "#10b981";
  if (primaryColor.includes("oklch")) primaryColor = "#10b981";
  let headerTextColor = settings.headerTextColor || "#ffffff";
  let tableHeaderBgColor = settings.tableHeaderBgColor || primaryColor;
  const showTableBorders = settings.showTableBorders !== false;
  const clientPosition = settings.clientPosition || "right";

  const dateStr = new Date(doc.date).toLocaleDateString(
    lang === "es" ? "es-ES" : lang === "en" ? "en-US" : "fr-FR",
  );

  let amountInLetters = "";
  if (lang === "fr") {
    amountInLetters = numberToWordsFr(totalAmount, settings);
  } else if (lang === "en") {
    amountInLetters = numberToWordsEn(totalAmount, settings);
  } else if (lang === "es") {
    amountInLetters = numberToWordsEs(totalAmount, settings);
  } else {
    amountInLetters = `${totalAmount.toLocaleString("fr-MA", { minimumFractionDigits: 2 })} ${settings?.defaultCurrencyCode || 'MAD'}`;
  }

  const displayId = doc.documentId || doc.id;
  const isDeliveryNote = docType === "Bon de Livraison";

  // Document Titles translation
  let titleDisplay = docType.toUpperCase();
  if (lang === "es") {
    if (docType === "Facture") titleDisplay = "FACTURA";
    else if (docType === "Devis") titleDisplay = "PRESUPUESTO";
    else if (docType === "Bon de Livraison") titleDisplay = "ALBARÁN";
    else if (docType === "Bon de Commande") titleDisplay = "PEDIDO";
    else if (docType === "Avoir") titleDisplay = "NOTA DE CRÉDITO";
  } else if (lang === "en") {
    if (docType === "Facture") titleDisplay = "INVOICE";
    else if (docType === "Devis") titleDisplay = "QUOTE";
    else if (docType === "Bon de Livraison") titleDisplay = "DELIVERY NOTE";
    else if (docType === "Bon de Commande") titleDisplay = "PURCHASE ORDER";
    else if (docType === "Avoir") titleDisplay = "CREDIT NOTE";
  } else if (docType === "Avoir") {
    titleDisplay = "FACTURE D’AVOIR";
  }

  let activeColumns: DocumentColumn[] = [];
  if (settings.documentColumns && settings.documentColumns.length > 0) {
    // Robust merge: ensure all default columns are present (important for newly added columns like 'unit')
    activeColumns = DEFAULT_COLUMNS.map((defCol) => {
      const savedCol = settings.documentColumns?.find((c) => c.id === defCol.id);
      if (savedCol) {
        return { ...defCol, ...savedCol };
      }
      return defCol;
    })
      .filter(
        (c) =>
          c.visible ||
          (c.id === "reference" &&
            doc.lineItems.some((item) => !!item.productCode)),
      )
      .sort((a, b) => a.order - b.order);
  } else {
    activeColumns = DEFAULT_COLUMNS.filter(
      (c) =>
        c.visible ||
        (c.id === "reference" &&
          doc.lineItems.some((item) => !!item.productCode)),
    );
  }

  if (isDeliveryNote && !showPrices) {
    activeColumns = activeColumns.filter(
      (c) =>
        c.id === "name" ||
        c.id === "quantity" ||
        c.id === "reference" ||
        c.id === "unit",
    );
  }

  if (isM2) {
    const qtyIndex = activeColumns.findIndex((c) => c.id === "quantity");
    if (qtyIndex !== -1) {
      activeColumns.splice(
        qtyIndex + 1,
        0,
        {
          id: "length" as any,
          label: lang === "es" ? "Ancho" : lang === "en" ? "Width" : "Larg.",
          visible: true,
          order: 2.1,
        },
        {
          id: "height" as any,
          label: lang === "es" ? "Alto" : lang === "en" ? "Height" : "Haut.",
          visible: true,
          order: 2.2,
        },
        { id: "m2" as any, label: "M²", visible: true, order: 2.3 },
      );
    }
  } else if (isML) {
    const qtyIndex = activeColumns.findIndex((c) => c.id === "quantity");
    if (qtyIndex !== -1) {
      activeColumns.splice(
        qtyIndex + 1,
        0,
        {
          id: "length" as any,
          label: lang === "es" ? "Largo" : lang === "en" ? "Length" : "Long.",
          visible: true,
          order: 2.1,
        },
        { id: "ml" as any, label: "ML", visible: true, order: 2.2 },
      );
    }
  } else if (isKg) {
    const qtyIndex = activeColumns.findIndex((c) => c.id === "quantity");
    if (qtyIndex !== -1) {
      activeColumns.splice(
        qtyIndex + 1,
        0,
        {
          id: "weight",
          label:
            lang === "es"
              ? "Peso (kg)"
              : lang === "en"
                ? "Weight (kg)"
                : "Poids (kg)",
          visible: true,
          order: 2.1,
        },
      );
    }
  } else if (isDays) {
    const qtyIndex = activeColumns.findIndex((c) => c.id === "quantity");
    if (qtyIndex !== -1) {
      activeColumns.splice(qtyIndex + 1, 0, {
        id: "days",
        label:
          lang === "es"
            ? "Días"
            : lang === "en"
              ? "Days"
              : dict.uDay || "Jours",
        visible: true,
        order: 2.1,
      });
    }
  }

  // Override labels for Language context
  activeColumns = activeColumns
    .map((col) => {
      let label = col.label;
      if (isDeliveryNote && !showPrices) {
        if (col.id === "unitPrice" || col.id === "vat" || col.id === "total")
          return null;
      }
      if (col.id === "unit") {
        label = dict.unit || "Unité";
      } else if (lang === "es") {
        if (col.id === "unitPrice")
          label = isModeTTC ? "P.U. Total" : "P.U. Base";
        if (col.id === "total")
          label = isModeTTC ? "Total con IVA" : "Base imponible";
        if (col.id === "vat") label = "IVA";
        if (col.id === "name") label = "Descripción";
        if (col.id === "quantity") label = "Cant.";
      } else if (lang === "en") {
        if (col.id === "unitPrice")
          label = isModeTTC ? "Unit Price (Incl.)" : "Unit Price";
        if (col.id === "total") label = isModeTTC ? "Total (Incl.)" : "Total";
        if (col.id === "vat") label = "VAT";
        if (col.id === "name") label = "Description";
        if (col.id === "quantity") label = "Qty";
      } else if (isModeTTC) {
        if (
          col.id === "unitPrice" &&
          (col.label === "P.U. HT" || col.label === "P.U.")
        )
          label = "P.U. TTC";
        if (
          col.id === "total" &&
          (col.label === "Total HT" || col.label === "Total")
        )
          label = "Total TTC";
      }
      return { ...col, label };
    })
    .filter(Boolean) as DocumentColumn[];

  let extraDateLabel = "";
  let extraDateValue = "";
  let secondDateLabel = "";
  let secondDateValue = "";

  if (
    docType === "Bon de Commande" &&
    (doc.expectedDate || doc.lineItems[0]?.expectedDate)
  ) {
    const dateVal = doc.expectedDate || doc.lineItems[0]?.expectedDate;
    extraDateLabel =
      lang === "es"
        ? "Entrega prevista"
        : lang === "en"
          ? "Expected delivery"
          : "Livraison prévue";
    extraDateValue = new Date(dateVal).toLocaleDateString(
      lang === "es" ? "es-ES" : lang === "en" ? "en-US" : "fr-FR",
    );
  } else if (
    docType === "Devis" &&
    (doc.expiryDate || doc.lineItems[0]?.expiryDate)
  ) {
    const dateVal = doc.expiryDate || doc.lineItems[0]?.expiryDate;
    extraDateLabel =
      lang === "es"
        ? "Válido hasta"
        : lang === "en"
          ? "Valid until"
          : "Valable jusqu'au";
    extraDateValue = new Date(dateVal).toLocaleDateString(
      lang === "es" ? "es-ES" : lang === "en" ? "en-US" : "fr-FR",
    );
  } else if (
    docType === "Facture" &&
    (doc.dueDate || doc.lineItems[0]?.dueDate)
  ) {
    const dateVal = doc.dueDate || doc.lineItems[0]?.dueDate;
    extraDateLabel =
      lang === "es" ? "Vencimiento" : lang === "en" ? "Due date" : "Échéance";
    extraDateValue = new Date(dateVal).toLocaleDateString(
      lang === "es" ? "es-ES" : lang === "en" ? "en-US" : "fr-FR",
    );
  }

  // Handle due date for Bon de Commande
  if (
    docType === "Bon de Commande" &&
    (doc.dueDate || doc.lineItems[0]?.dueDate)
  ) {
    const dateVal = doc.dueDate || doc.lineItems[0]?.dueDate;
    secondDateLabel =
      lang === "es" ? "Vencimiento" : lang === "en" ? "Due date" : "Échéance";
    secondDateValue = new Date(dateVal).toLocaleDateString(
      lang === "es" ? "es-ES" : lang === "en" ? "en-US" : "fr-FR",
    );
  }

  const docSubject = doc.subject || doc.lineItems[0]?.subject || "";
  const docPaymentMethod = doc.paymentMethod || doc.lineItems[0]?.paymentMethod || "";
  const docCheckNumber = doc.checkNumber || doc.lineItems[0]?.checkNumber || "";
  const docBankName = doc.bankName || doc.lineItems[0]?.bankName || "";

  const logoHtml = settings.logo
    ? `<img src="${settings.logo}" style="max-height: 120px; max-width: ${settings.logoWidth || 200}px; object-fit: contain;" />`
    : `<h1 style="font-size: 24px; font-weight: bold; color: ${primaryColor}; margin: 0;">${settings.companyName}</h1>`;

  const recipientName = recipient.name;
  const recipientCompany = recipient.company
    ? `<div style="font-weight: bold;">${recipient.company}</div>`
    : "";
  const recipientEmail = recipient.email ? `<div>${recipient.email}</div>` : "";
  const recipientPhone = recipient.phone ? `<div>${recipient.phone}</div>` : "";
  const recipientAddress = recipient.address
    ? `<div style="margin-bottom:2px;">${recipient.address.replace(/\n/g, "<br/>")}</div>`
    : "";
  const recipientIce = recipient.ice
    ? `<div>${taxIdLabel}: ${recipient.ice}</div>`
    : "";

  const companyAddress = settings.address
    ? settings.address.replace(/\n/g, "<br/>")
    : "";
  const companyContact = [settings.phone, settings.email, settings.website]
    .filter(Boolean)
    .join(" | ");

  const capitalDisplay = settings.capital ? `Capital: ${settings.capital}` : "";
  const legalIds = [
    settings.ice ? `${taxIdLabel}: ${settings.ice}` : "",
    settings.rc ? `RC: ${settings.rc}` : "",
    settings.fiscalId ? `IF: ${settings.fiscalId}` : "",
    settings.patente ? `TP: ${settings.patente}` : "",
    settings.cnss ? `CNSS: ${settings.cnss}` : "",
    capitalDisplay,
  ]
    .filter(Boolean)
    .join(" &nbsp;|&nbsp; ");

  // Helper to identify the days/jours column robustly
  const isDaysCol = (c: any) => {
    const cid = String(c.id || "").toLowerCase();
    const clbl = String(c.label || "").toLowerCase();
    // Matching: any ID or Label containing 'jour', 'day', 'día', 'dias', 'يوم', or 'أيام'
    return (
      cid.includes("day") ||
      cid.includes("jour") ||
      clbl.includes("jour") ||
      clbl.includes("day") ||
      clbl.includes("día") ||
      clbl.includes("dias") ||
      clbl.includes("يوم") ||
      clbl.includes("أيام")
    );
  };

  const headerRowHtml = activeColumns
    .map((col, idx) => {
      let align = "left";
      let width = "";
      if (col.id === "reference") {
        align = "left";
        width = "width: 10%;";
      } else if (col.id === "name") {
        align = "left";
        width = "width: auto; min-width: 45%;";
      } else if (col.id === "quantity") {
        align = "center";
        width = "width: 7%;";
      } else if (isDaysCol(col)) {
        align = "center";
        width = "width: 7%;";
      } else if (col.id === "length") {
        align = "center";
        width = "width: 7%;";
      } else if (col.id === "height") {
        align = "center";
        width = "width: 7%;";
      } else if (col.id === "m2") {
        align = "center";
        width = "width: 7%;";
      } else if (col.id === "ml") {
        align = "center";
        width = "width: 7%;";
      } else if (col.id === "weight") {
        align = "center";
        width = "width: 7%;";
      } else if (col.id === "totalWeight") {
        align = "center";
        width = "width: 7%;";
      } else if (col.id === "vat") {
        align = "center";
        width = "width: 6%;";
      } else if (col.id === "unit") {
        align = "center";
        width = "width: 8%;";
      } else if (col.id === "unitPrice") {
        align = "right";
        width = "width: 12%;";
      } else if (col.id === "total") {
        align = "right";
        width = "width: 12%;";
      }

      const isFirst = idx === 0;
      const isLast = idx === activeColumns.length - 1;
      const borderStyle = "";

      return `<th style="padding: ${options?.isPDFDownload ? "6px 12px 14px 12px" : "10px 12px"}; text-align: ${align}; vertical-align: middle; line-height: 1.2; font-size: 11px; text-transform: uppercase; white-space: nowrap; letter-spacing: 0.05em; ${borderStyle} ${width}">${col.label}</th>`;
    })
    .join("");

  const rowsHtml = doc.lineItems
    .map((item, index) => {
      const cellsHtml = activeColumns
        .map((col, cIdx) => {
          let content = "";
          let align = "left";
          let style = "";

          const isFirst = cIdx === 0;
          const isLast = cIdx === activeColumns.length - 1;
          const cellBorder = (isLast || !showTableBorders) ? "" : "border-right: 0.5px solid #d1d5db;";

          const unitPriceTTC = item.unitPrice * (1 + item.vat / 100);
          const totalTTC =
            item.quantity *
            getLineMultiplier(item) *
            item.unitPrice *
            (1 + item.vat / 100);

          // SYNC DISPLAY VALUE WITH CALCULATION MULTIPLIER
          const multiplier = getLineMultiplier(item);
          const isItemInDaysMode =
            item.calculationMode === "days" ||
            doc.lineItems[0]?.calculationMode === "days";

          // Aggressive extraction for display fallback
          const extraction =
            item.days ||
            (item as any).jours ||
            (item as any).jour ||
            (item as any).itemDays ||
            (item as any).nb_jours ||
            0;
          const fallbackDaysValue =
            Number(extraction) > 0 ? Number(extraction) : 1;

          // If the calculation mode is days, we MUST use the multiplier that produced the correct total
          const finalDaysDisplayValue = isItemInDaysMode
            ? multiplier
            : fallbackDaysValue;

            if (isDaysCol(col)) {
            content = String(finalDaysDisplayValue);
            align = "center";
            style = "font-size: 10.5px; font-weight: 700; color: #111827;";
          } else {
            switch (col.id) {
              case "reference":
                content = item.productCode || "-";
                align = "left";
                style = "font-size: 12.3px; color: #4b5563;";
                break;
              case "name":
                content = `
                            <div style="font-weight: 500; color: #111827; font-size: 10.5px; line-height: 1.2; overflow-wrap: anywhere; word-break: break-word; white-space: pre-wrap;">${item.name}</div>
                            ${item.description ? `<div style="font-size: 9px; color: #6b7280; margin-top: 2px; line-height: 1.1; overflow-wrap: anywhere; word-break: break-word; white-space: pre-wrap;">${item.description}</div>` : ""}
                        `;
                break;
              case "quantity":
                content = item.quantity.toString();
                align = "center";
                style = "font-weight: 700; font-size: 10.5px;";
                break;
              case "unit":
                content = item.unit || "-";
                align = "center";
                style = "font-size: 9.5px; color: #4b5563;";
                break;
              case "length":
                content = (item.length || 1).toString();
                align = "center";
                style = "font-size: 10.5px;";
                break;
              case "height":
                content = (item.height || 1).toString();
                align = "center";
                style = "font-size: 10.5px;";
                break;
              case "m2":
                content = (
                  item.quantity *
                  (Number(item.length) || 1) *
                  (Number(item.height) || 1)
                ).toLocaleString("fr-MA", { maximumFractionDigits: 2 });
                align = "center";
                style = "font-size: 10.5px; font-weight: 500;";
                break;
              case "ml":
                content = (
                  item.quantity * (Number(item.length) || 1)
                ).toLocaleString("fr-MA", { maximumFractionDigits: 2 });
                align = "center";
                style = "font-size: 10.5px; font-weight: 500;";
                break;
              case "weight":
                content = (item.weight || 1).toString();
                align = "center";
                style = "font-size: 10.5px;";
                break;
              case "totalWeight":
                content = (
                  item.quantity * (Number(item.weight) || 1)
                ).toLocaleString("fr-MA", { maximumFractionDigits: 2 });
                align = "center";
                style = "font-size: 10.5px; font-weight: 500;";
                break;
              case "unitPrice":
                content = (
                  isModeTTC ? unitPriceTTC : item.unitPrice
                ).toLocaleString("fr-MA", { minimumFractionDigits: 2 });
                align = "right";
                style = "font-size: 10.5px;";
                break;
              case "vat":
                content = `${item.vat}%`;
                align = "center";
                style = "font-size: 10.5px;";
                break;
              case "total":
                const subTotalItem =
                  item.quantity * multiplier * item.unitPrice;
                content = (isModeTTC ? totalTTC : subTotalItem).toLocaleString(
                  "fr-MA",
                  { minimumFractionDigits: 2 },
                );
                align = "right";
                style = "font-weight: 700; font-size: 10.5px;";
                break;
              case "days":
                content = String(finalDaysDisplayValue);
                align = "center";
                style = "font-size: 10.5px; font-weight: 700;";
                break;
              default:
                content = "-";
                break;
            }
          }

          return `<td style="padding: ${options?.isPDFDownload ? "6px 12px 14px 12px" : "10px 12px"}; border-bottom: 0.5px solid #d1d5db; ${cellBorder} text-align: ${align}; vertical-align: middle; ${style}">${content}</td>`;
        })
        .join("");

      return `<tr class="item-row" style="background-color: ${index % 2 === 0 ? "#fff" : "#f9fafb"};">${cellsHtml}</tr>`;
    })
    .join("");

  let paymentInfoHtml = "";
  if ((docType === "Facture" || docType === "Bon de Livraison" || docType === "Bon de Commande") && showPrices) {
    const paid = doc.amountPaid || doc.paymentAmount || 0;
    const remaining = totalAmount - paid;
    if (paid > 0) {
      paymentInfoHtml = `
                <div style="margin-top: 10px; font-size: 12px; color: #059669;">
                    ${lang === "es" ? "Ya pagado" : lang === "en" ? "Already paid" : "Déjà réglé"} : <b>${paid.toLocaleString("fr-MA", { style: 'currency', currency: settings?.defaultCurrencyCode || 'MAD' })}</b>
                    ${remaining > 0.1 ? `<br/><span style="color: #d97706;">${lang === "es" ? "Importe pendiente" : lang === "en" ? "Balance due" : "Reste à payer"} : <b>${remaining.toLocaleString("fr-MA", { style: 'currency', currency: settings?.defaultCurrencyCode || 'MAD' })}</b></span>` : `<br/><span style="color: #059669; font-weight: bold;">${lang === "es" ? "Liquidado" : lang === "en" ? "Settled" : "Soldé"}</span>`}
                </div>
            `;
    }
  }

  const isInfoOnLeft = settings.documentInfoPosition === "left";

  const docInfoHtml = `
        <div style="font-size: 26px; font-weight: bold; text-transform: uppercase; color: ${primaryColor}; margin-bottom: 10px;">${titleDisplay}</div>
        <div style="font-size: 16px; font-weight: 600; color: #111827;">N° ${displayId}</div>
        <div style="margin-top: 10px; font-size: 12px;">
            <div>${dict.date || "Date"} : <b>${dateStr}</b></div>
            ${extraDateLabel ? `<div>${extraDateLabel} : <b>${extraDateValue}</b></div>` : ""}
            ${secondDateLabel ? `<div>${secondDateLabel} : <b>${secondDateValue}</b></div>` : ""}
            ${doc.purchaseOrderNumber ? `<div>${dict.purchaseOrderNumber || "N° BC"} : <b>${doc.purchaseOrderNumber}</b></div>` : ""}
            ${doc.reference ? `<div>${dict.reference || "Réf"} : <b>${doc.reference}</b></div>` : ""}
            ${doc.invoiceId ? `<div>${lang === "es" ? "Ref. Factura" : lang === "en" ? "Invoice Ref" : "Réf. Facture"} : <b>${doc.invoiceId}</b></div>` : ""}
        </div>
    `;

  const topHeaderHtml = isInfoOnLeft
    ? `
        <div style="margin-bottom: 20px;">
            <div style="width: 100%; margin-bottom: 20px;">
                ${logoHtml}
                <div style="margin-top: 15px; font-size: 12px; line-height: 1.5;">
                    <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${settings.companyName}</div>
                    ${companyAddress}<br/>
                    <div style="margin-top: 5px; color: #6b7280;">${companyContact}</div>
                </div>
            </div>
            <div style="text-align: left; margin-top: 20px;">
                ${docInfoHtml}
            </div>
        </div>
    `
    : `
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <div style="width: 50%;">
                ${logoHtml}
                <div style="margin-top: 15px; font-size: 12px; line-height: 1.5;">
                    <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${settings.companyName}</div>
                    ${companyAddress}<br/>
                    <div style="margin-top: 5px; color: #6b7280;">${companyContact}</div>
                </div>
            </div>
            <div style="width: 45%; text-align: right;">
                ${docInfoHtml}
            </div>
        </div>
    `;

  const clientInfoHtml = `
        <div style="display: flex; justify-content: ${clientPosition === 'left' ? 'flex-start' : 'flex-end'}; margin-bottom: 20px;">
            <div style="width: 45%; background-color: #f9fafb; padding: ${options?.isPDFDownload ? "8px 16px 12px 16px" : "12px 16px"}; border-radius: 6px; border: 1px solid #e5e7eb; line-height: 1.4; display: flex; flex-direction: column; justify-content: flex-start; align-items: flex-start;">
                <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: #9ca3af; margin-bottom: 6px; line-height: 1;">${dict.pdfAddressedTo || "Adressé à"}</div>
                <div style="font-size: 14px; color: #111827; font-weight: 600;">
                    ${recipientCompany}
                    ${recipientName ? `<div style="${recipientCompany ? "font-weight: normal; margin-top: 2px;" : ""} line-height: 1.2;">${recipientName}</div>` : ""}
                </div>
                ${
                  recipientAddress ||
                  recipientIce ||
                  recipientEmail ||
                  recipientPhone
                    ? `
                <div style="margin-top: 6px; font-size: 12px; color: #4b5563;">
                    ${recipientAddress}
                    ${recipientIce}
                    ${recipientEmail}
                    ${recipientPhone}
                </div>
                `
                    : ""
                }
            </div>
        </div>
    `;

  const itemsTableHtml = `
        <table style="width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 20px;">
            <thead>
                <tr style="background-color: ${tableHeaderBgColor}; color: ${headerTextColor}; -webkit-print-color-adjust: exact;">
                    ${headerRowHtml}
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>
    `;

  // Financials Block
  const financialsHtml = `
        <div class="totals-section" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
            <div style="width: 55%; padding-top: 10px;">
                ${
                  showAmountInWords
                    ? `
                    <div style="background-color: #f3f4f6; padding: ${options?.isPDFDownload ? "3px 12px 13px 12px" : "10px 12px"}; border-radius: 4px; border-left: 3px solid ${primaryColor}; display: flex; flex-direction: column; justify-content: flex-start; align-items: flex-start;">
                        <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold; margin-bottom: 4px; line-height: 1.2;">${txtAmountInWords}</div>
                        <div style="font-size: 13px; color: #111827; font-weight: 600; font-style: italic; line-height: 1.2;">
                            ${amountInLetters}
                        </div>
                    </div>
                `
                    : ""
                }
                ${
                  settings.defaultPaymentTerms
                    ? `
                    <div style="margin-top: 10px; font-size: 11px; color: #4b5563;">
                        ${settings.defaultPaymentTerms}
                    </div>
                `
                    : ""
                }
                ${
                  doc.notes
                    ? `
                    <div style="margin-top: 15px; font-size: 11px; color: #6b7280; white-space: pre-wrap;">
                        <span style="font-weight: 600;">${dict.notes || "Notes"}:</span> ${doc.notes}
                    </div>
                `
                    : ""
                }
            </div>
            <div style="width: 40%;">
                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb;">
                    <span>${txtTotalHt}</span>
                    <span style="font-weight: 600;">${subTotal.toLocaleString("fr-MA", { style: 'currency', currency: settings?.defaultCurrencyCode || 'MAD' })}</span>
                </div>
                ${
                  discountAmount > 0
                    ? `
                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb;">
                    <span>${dict.globalDiscount || "Remise exceptionnelle"} ${doc.discountType === "percentage" ? `(-${doc.discountValue}%)` : ""}</span>
                    <span style="font-weight: 600; color: #dc2626;">- ${discountAmount.toLocaleString("fr-MA", { style: 'currency', currency: settings?.defaultCurrencyCode || 'MAD' })}</span>
                </div>
                `
                    : ""
                }
                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb;">
                    <span>${txtTotalTax}</span>
                    <span>${vatAmount.toLocaleString("fr-MA", { style: 'currency', currency: settings?.defaultCurrencyCode || 'MAD' })}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 12px 0 4px 0; font-size: 16px; color: #000000; font-weight: bold; margin-top: 4px;">
                    <span>${txtTotalNet}</span>
                    <span>${totalAmount.toLocaleString("fr-MA", { style: 'currency', currency: settings?.defaultCurrencyCode || 'MAD' })}</span>
                </div>
                ${paymentInfoHtml}
            </div>
        </div>
    `;

  const notesOnlyHtml = doc.notes
    ? `
        <div style="margin-bottom: 20px; font-size: 11px; color: #6b7280;">
            <span style="font-weight: 600;">${dict.notes || "Notes"}:</span> ${doc.notes}
        </div>
    `
    : "";

  const signaturesHtml = `
        <div class="totals-section" style="display: flex; justify-content: flex-end; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
            <div style="width: 45%; text-align: center;">
                <div style="font-weight: bold; margin-bottom: 5px; text-decoration: underline;">${txtSigRecipient}</div>
                ${settings.showSignatureRecipient && settings.stamp ? `<img src="${settings.stamp}" style="max-height: 300px; width: ${settings.stampWidth || 220}px; object-fit: contain; margin-top: 2px;" />` : settings.showSignatureRecipient ? '<div style="height: 80px;"></div>' : ""}
            </div>
        </div>
    `;

  let totalsHtml = "";
  if (isDeliveryNote && !showPrices) {
    totalsHtml =
      notesOnlyHtml + (settings?.showSignatureRecipient ? signaturesHtml : "");
  } else if (
    docType === "Facture" ||
    docType === "Devis" ||
    docType === "Avoir" ||
    isDeliveryNote
  ) {
    totalsHtml =
      financialsHtml + (settings?.showSignatureRecipient ? signaturesHtml : "");
  } else {
    totalsHtml = financialsHtml + (settings?.showSignatureRecipient ? signaturesHtml : "");
  }

  const footerHtml = `
        <div style="text-align: center; padding-top: 2px; margin-top: auto;">
            ${settings.footerNotes ? `<div style="font-size: 11px; color: #000000; margin-bottom: 4px; white-space: pre-wrap; font-style: normal;">${settings.footerNotes}</div>` : ""}
            <div style="font-size: 10px; color: #000000; font-weight: normal; letter-spacing: 0.02em;">
                ${legalIds}
            </div>
        </div>
    `;

  // --- Pagination Logic ---
  const items = [...doc.lineItems];

  const getCellsHtml = (item: any) => {
    return activeColumns
      .map((col, cIdx) => {
        let content = "";
        let align = "left";
        let style = "";

        const isFirst = cIdx === 0;
        const isLast = cIdx === activeColumns.length - 1;
        const cellBorder = (isLast || !showTableBorders) ? "" : "border-right: 0.5px solid #d1d5db;";

        const unitPriceTTC = item.unitPrice * (1 + item.vat / 100);
        const totalTTC =
          item.quantity *
          getLineMultiplier(item) *
          item.unitPrice *
          (1 + item.vat / 100);

        // SYNC DISPLAY VALUE WITH CALCULATION MULTIPLIER
        const multiplier = getLineMultiplier(item);
        const isItemInDaysMode =
          item.calculationMode === "days" ||
          doc.lineItems[0]?.calculationMode === "days";
        const extraction =
          item.days ||
          (item as any).jours ||
          (item as any).jour ||
          (item as any).itemDays ||
          (item as any).nb_jours ||
          0;
        const fallbackDaysValue =
          Number(extraction) > 0 ? Number(extraction) : 1;
        const finalDaysDisplayValue = isItemInDaysMode
          ? multiplier
          : fallbackDaysValue;

        if (isDaysCol(col)) {
          content = String(finalDaysDisplayValue);
          align = "center";
          style = "font-size: 10.5px; font-weight: 700; color: #111827;";
        } else {
          switch (col.id) {
            case "reference":
              content = item.productCode || "-";
              align = "left";
              style = "font-size: 10.5px; color: #4b5563;";
              break;
            case "name":
              content = `
                        <div style="font-weight: 500; color: #111827; font-size: 10.5px; line-height: 1.2; overflow-wrap: anywhere; word-break: break-word; white-space: pre-wrap;">${item.name}</div>
                        ${item.description ? `<div style="font-size: 9px; color: #6b7280; margin-top: 2px; line-height: 1.1; overflow-wrap: anywhere; word-break: break-word; white-space: pre-wrap;">${item.description}</div>` : ""}
                    `;
              break;
            case "quantity":
              content = item.quantity.toString();
              align = "center";
              style = "font-weight: 700; font-size: 10.5px;";
              break;
            case "unit":
              content = item.unit || "-";
              align = "center";
              style = "font-size: 9.5px; color: #4b5563;";
              break;
            case "length" as any:
              content = (item.length || 1).toString();
              align = "center";
              style = "font-size: 10.5px;";
              break;
            case "height" as any:
              content = (item.height || 1).toString();
              align = "center";
              style = "font-size: 10.5px;";
              break;
            case "m2" as any:
              content = (
                item.quantity *
                (item.length || 1) *
                (item.height || 1)
              ).toLocaleString("fr-MA", { maximumFractionDigits: 2 });
              align = "center";
              style = "font-size: 10.5px; font-weight: 500;";
              break;
            case "ml" as any:
              content = (item.quantity * (item.length || 1)).toLocaleString(
                "fr-MA",
                { maximumFractionDigits: 2 },
              );
              align = "center";
              style = "font-size: 10.5px; font-weight: 500;";
              break;
            case "weight" as any:
              content = (item.weight || 1).toString();
              align = "center";
              style = "font-size: 10.5px;";
              break;
            case "totalWeight" as any:
              content = (item.quantity * (item.weight || 1)).toLocaleString(
                "fr-MA",
                { maximumFractionDigits: 2 },
              );
              align = "center";
              style = "font-size: 10.5px; font-weight: 500;";
              break;
            case "unitPrice":
              content = (
                isModeTTC ? unitPriceTTC : item.unitPrice
              ).toLocaleString("fr-MA", { minimumFractionDigits: 2 });
              align = "right";
              style = "font-size: 10.5px;";
              break;
            case "vat":
              content = `${item.vat}%`;
              align = "center";
              style = "font-size: 10.5px;";
              break;
            case "total":
              content = (
                isModeTTC
                  ? totalTTC
                  : item.quantity * getLineMultiplier(item) * item.unitPrice
              ).toLocaleString("fr-MA", { minimumFractionDigits: 2 });
              align = "right";
              style = "font-weight: 700; font-size: 10.5px;";
              break;
            case "days":
              content = String(finalDaysDisplayValue);
              align = "center";
              style = "font-size: 10.5px; font-weight: 700;";
              break;
            default:
              content = "-";
              break;
          }
        }

        return `<td style="padding: ${options?.isPDFDownload ? "6px 12px 14px 12px" : "10px 12px"}; border-bottom: 0.5px solid #d1d5db; ${cellBorder} text-align: ${align}; vertical-align: middle; ${style}">${content}</td>`;
      })
      .join("");
  };

  // 1. EXACT DOM MEASUREMENT PAGINATION
  const allRowsHtml = items
    .map((item) => `<tr>${getCellsHtml(item)}</tr>`)
    .join("");

  const measureBox = document.createElement("div");
  measureBox.style.position = "absolute";
  measureBox.style.left = "-9999px";
  measureBox.style.top = "0";
  measureBox.style.visibility = "hidden";
  measureBox.style.width = "210mm";
  measureBox.style.overflow = "hidden";
  measureBox.innerHTML = `
        <div style="width: 210mm; min-width: 210mm; max-width: 210mm; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; box-sizing: border-box; padding: 15mm 15mm 28mm 15mm; -webkit-text-size-adjust: 100%; text-size-adjust: 100%;">
            <div id="measure-header" style="position: relative; z-index: 2;">
                ${topHeaderHtml}
                ${clientInfoHtml}
                <div style="display: flex; gap: 40px; margin-bottom: 15px; flex-wrap: wrap;">
                    ${docSubject ? `<div style="font-weight: 600;">Objet : <span style="font-weight: normal;">${docSubject}</span></div>` : ""}
                    ${docPaymentMethod ? `<div style="font-weight: 600;">Mode de paiement : <span style="font-weight: normal;">${docPaymentMethod} ${docPaymentMethod === 'Chèque' && docCheckNumber ? `(N° ${docCheckNumber}${docBankName ? ` - ${docBankName}` : ''})` : ''}</span></div>` : ""}
                </div>
            </div>
            <table style="width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 20px;">
                <thead id="measure-thead">
                    <tr>${headerRowHtml}</tr>
                </thead>
                <tbody id="measure-tbody">
                    ${allRowsHtml}
                </tbody>
            </table>
            <div id="measure-totals">
                ${totalsHtml}
            </div>
        </div>
        <div id="measure-a4" style="height: 297mm;"></div>
        <div id="measure-padd" style="height: 43mm;"></div>
    `;

  document.body.appendChild(measureBox);

  const headerHeight =
    document.getElementById("measure-header")?.offsetHeight || 0;
  const theadHeight =
    document.getElementById("measure-thead")?.offsetHeight || 0;
  const totalsHeight =
    document.getElementById("measure-totals")?.offsetHeight || 0;

  const tbody = document.getElementById("measure-tbody");
  const rowHeightsPx = tbody
    ? Array.from(tbody.children).map((el) => (el as HTMLElement).offsetHeight)
    : items.map(() => 40);

    const a4FullHeight =
    document.getElementById("measure-a4")?.offsetHeight || 1120;
  
  // Calculate padding based on 15mm top + 28mm bottom = 43mm total padding
  const paddingHeights = (a4FullHeight * 43) / 297;

  if (document.body.contains(measureBox)) {
    document.body.removeChild(measureBox);
  }

  // True Usable Pixel Height
  // Using a slightly more conservative safety margin for visual breathing room and to prevent extra pages
  // We subtract 20px (~5mm) extra for a small buffer before the footer
  const maxUsableHeight = a4FullHeight - paddingHeights - 8;
  const SAFETY_MARGIN = 4; // allow for small rendering variations

  // 2. Pack items into chunks optimally
  const itemChunks: any[][] = [];
  let tempIndex = 0;

  while (tempIndex < items.length) {
    let currentHeight = headerHeight + theadHeight + 20; // 20px for table margin-bottom
    const chunk: any[] = [];

    while (tempIndex < items.length) {
      const rh = rowHeightsPx[tempIndex] || 35;

      if (
        currentHeight + rh + SAFETY_MARGIN > maxUsableHeight &&
        chunk.length > 0
      ) {
        break;
      }

      chunk.push(items[tempIndex]);
      currentHeight += rh;
      tempIndex++;
    }
    itemChunks.push(chunk);
  }

  // 3. Check if Totals fit on the last page
  const lastChunk = itemChunks[itemChunks.length - 1] || [];
  let lastChunkHeight = headerHeight + theadHeight + 20; // Matches table margin-bottom
  const lastChunkStartIndex = items.length - lastChunk.length;
  for (let i = 0; i < lastChunk.length; i++) {
    lastChunkHeight += rowHeightsPx[lastChunkStartIndex + i];
  }

  if (lastChunkHeight + totalsHeight + SAFETY_MARGIN > maxUsableHeight) {
    // If the last page is nearly full, move the last item to a new page to join the totals
    if (lastChunk.length > 1) {
      const lastItem = itemChunks[itemChunks.length - 1].pop();
      itemChunks.push([lastItem]);
    } else {
      itemChunks.push([]); // Totals get pushed to their own new page
    }
  }

  const totalPages = itemChunks.length;
  const pages: string[] = [];

  itemChunks.forEach((pageItems, index) => {
    const pageNum = index + 1;
    const isLastPage = pageNum === totalPages;

    const pageRowsHtml = pageItems
      .map((item, idx) => {
        const cellsHtml = getCellsHtml(item);
        return `<tr class="item-row" style="background-color: ${idx % 2 === 0 ? "#fff" : "#f9fafb"};">${cellsHtml}</tr>`;
      })
      .join("");

    const pageHtml = `
            <div class="pdf-page" style="width: 210mm; height: 296.5mm; max-height: 296.5mm; background: white; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #374151; display: flex; flex-direction: column; box-sizing: border-box; padding: 15mm 15mm 28mm 15mm; position: relative; overflow: hidden; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; ${isLastPage ? "" : "page-break-after: always;"}">
                <style>
                    * { box-sizing: border-box; }
                    .content-grow { flex: 1; z-index: 2; position: relative; }
                    
                    /* Rich Text Formatting Styles */
                    p { margin: 0 0 4px 0; padding: 0; }
                    p:last-child { margin-bottom: 0; }
                    .ql-size-small { font-size: 0.75em; }
                    .ql-size-large { font-size: 1.5em; }
                    .ql-size-huge { font-size: 2.5em; }
                    .ql-align-center { text-align: center; }
                    .ql-align-right { text-align: right; }
                    .ql-align-justify { text-align: justify; }
                    strong, b { font-weight: bold; }
                    em, i { font-style: italic; }
                    u { text-decoration: underline; }
                </style>
                
                ${
                  settings.logo && (settings.showLogoWatermark ?? true)
                    ? `
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 85%; z-index: 0; opacity: ${settings.logoWatermarkOpacity ?? 0.07}; pointer-events: none;">
                        <img src="${settings.logo}" style="width: 100%; height: auto; object-fit: contain;" />
                    </div>
                `
                    : ""
                }

                <div style="position: relative; z-index: 2;">
                    ${topHeaderHtml}
                    ${clientInfoHtml}
                    <div style="display: flex; gap: 40px; margin-bottom: 15px; flex-wrap: wrap;">
                        ${docSubject ? `<div style="font-weight: 600;">${dict.pdfSubject || "Objet"} : <span style="font-weight: normal;">${docSubject}</span></div>` : ""}
                        ${docPaymentMethod ? `<div style="font-weight: 600;">${dict.paymentMethod || "Mode de paiement"} : <span style="font-weight: normal;">${docPaymentMethod} ${docPaymentMethod === 'Chèque' && docCheckNumber ? `(N° ${docCheckNumber}${docBankName ? ` - ${docBankName}` : ''})` : ''}</span></div>` : ""}
                    </div>
                </div>

                <div class="content-grow">
                    ${
                      pageItems.length > 0
                        ? `
                    <table style="width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 20px;">
                        <thead>
                            <tr style="background-color: ${tableHeaderBgColor}; color: ${headerTextColor}; -webkit-print-color-adjust: exact;">
                                ${headerRowHtml}
                            </tr>
                        </thead>
                        <tbody>
                            ${pageRowsHtml}
                        </tbody>
                    </table>
                    `
                        : ""
                    }
                    ${isLastPage ? totalsHtml : ""}
                </div>

                <div style="position: absolute; bottom: 4mm; left: 15mm; right: 15mm; padding-top: 4px; border-top: 1px solid #000000; z-index: 2; background: white;">
                    ${footerHtml}
                    <div style="text-align: right; font-size: 9px; color: #9ca3af; margin-top: 5px;">Page ${pageNum} / ${totalPages}</div>
                </div>
            </div>
        `;

    pages.push(pageHtml);
  });

  if (document.body.contains(measureBox)) {
    document.body.removeChild(measureBox);
  }

  return `<div id="pdf-container">${pages.join("")}</div>`;
};

export const generatePDFBlob = async (
  docType: DocumentType,
  doc: DocumentData,
  settings: CompanySettings | null,
  recipient: Client | Supplier | undefined,
  options?: PDFOptions,
): Promise<Blob> => {
  const template = generateDocumentHTML(docType, doc, settings, recipient, {
    ...options,
    isPDFDownload: true,
  });

  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.innerHTML = template;

  document.body.appendChild(container);

  try {
    const contentElement = container.firstElementChild;

    const opt: any = {
      margin: 0,
      image: { type: "jpeg", quality: 1 },
      pagebreak: { mode: ["css", "legacy"] },
      html2canvas: {
        scale: options?.isPDFDownload ? 2 : 1.5,
        useCORS: true,
        logging: false,
        letterRendering: true,
        width: 794,
        windowWidth: 794,
        onclone: (clonedDoc: Document) => {
          // Remove all oklch color references from styles to prevent html2canvas crash
          const styleTags = clonedDoc.getElementsByTagName("style");
          for (let i = 0; i < styleTags.length; i++) {
            styleTags[i].innerHTML = styleTags[i].innerHTML.replace(
              /oklch\([^)]+\)/g,
              "#000000",
            );
          }
          // Also check for link tags that might contain oklch
          const linkTags = clonedDoc.getElementsByTagName("link");
          for (let i = linkTags.length - 1; i >= 0; i--) {
            if (linkTags[i].rel === "stylesheet") {
              linkTags[i].parentNode?.removeChild(linkTags[i]);
            }
          }
        },
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    return await (html2pdf() as any).set(opt).from(contentElement).output('blob');
  } finally {
    document.body.removeChild(container);
  }
};

export const generatePDF = async (
  docType: DocumentType,
  doc: DocumentData,
  settings: CompanySettings | null,
  recipient: Client | Supplier | undefined,
  options?: PDFOptions,
): Promise<void> => {
  const template = generateDocumentHTML(docType, doc, settings, recipient, {
    ...options,
    isPDFDownload: true,
  });
  const displayId = doc.documentId || doc.id;

  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.innerHTML = template;

  document.body.appendChild(container);

  try {
    const contentElement = container.firstElementChild;

    const opt: any = {
      margin: 0,
      filename: `${docType.toLowerCase()}_${displayId}.pdf`,
      image: { type: "jpeg", quality: 1 },
      pagebreak: { mode: ["css", "legacy"] },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        letterRendering: true,
        width: 794,
        windowWidth: 794,
        onclone: (clonedDoc: Document) => {
          // Remove all oklch color references from styles to prevent html2canvas crash
          const styleTags = clonedDoc.getElementsByTagName("style");
          for (let i = 0; i < styleTags.length; i++) {
            styleTags[i].innerHTML = styleTags[i].innerHTML.replace(
              /oklch\([^)]+\)/g,
              "#000000",
            );
          }
          // Also check for link tags that might contain oklch
          const linkTags = clonedDoc.getElementsByTagName("link");
          for (let i = linkTags.length - 1; i >= 0; i--) {
            if (linkTags[i].rel === "stylesheet") {
              linkTags[i].parentNode?.removeChild(linkTags[i]);
            }
          }
        },
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    await (html2pdf() as any).set(opt).from(contentElement).save();
  } finally {
    document.body.removeChild(container);
  }
};

export const printDocument = (
  docType: DocumentType,
  doc: DocumentData,
  settings: CompanySettings | null,
  recipient: Client | Supplier | undefined,
  options?: PDFOptions,
): void => {
  const lang = localStorage.getItem("app_language") || "fr";
  const dict = (translations as any)[lang] || translations["fr"];
  const htmlContent = generateDocumentHTML(
    docType,
    doc,
    settings,
    recipient,
    options,
  );
  const displayId = doc.documentId || doc.id;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(`
            <html>
                <head>
                    <title>${docType} #${displayId}</title>
                    <style>
                        body { margin: 0; padding: 0; }
                        @media print {
                            @page { margin: 0; size: A4; }
                            body { -webkit-print-color-adjust: exact; }
                            tr.item-row { page-break-inside: avoid; }
                        }
                        /* Rich Text Formatting Styles */
                        p { margin: 0 0 4px 0; padding: 0; }
                        p:last-child { margin-bottom: 0; }
                        .ql-size-small { font-size: 0.75em; }
                        .ql-size-large { font-size: 1.5em; }
                        .ql-size-huge { font-size: 2.5em; }
                        .ql-align-center { text-align: center; }
                        .ql-align-right { text-align: right; }
                        .ql-align-justify { text-align: justify; }
                        strong, b { font-weight: bold; }
                        em, i { font-style: italic; }
                        u { text-decoration: underline; }
                    </style>
                </head>
                <body>
                    ${htmlContent}
                </body>
            </html>
        `);
    printWindow.document.close();

    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  } else {
    alert(
      "Veuillez autoriser les pop-ups pour utiliser la fonction d'impression directe.",
    );
  }
};

// --- English Number to Words ---
const numberToWordsEn = (amount: number, settings?: CompanySettings | null): string => {
  const units = [
    "",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
  ];
  const teens = [
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ];
  const tens = [
    "",
    "",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
  ];
  const scales = ["", "thousand", "million", "billion"];

  const convertGroup = (n: number): string => {
    if (n === 0) return "";
    let res = "";
    if (n >= 100) {
      res += units[Math.floor(n / 100)] + " hundred ";
      n %= 100;
    }
    if (n >= 20) {
      res +=
        tens[Math.floor(n / 10)] + (n % 10 !== 0 ? "-" + units[n % 10] : "");
    } else if (n >= 10) {
      res += teens[n - 10];
    } else if (n > 0) {
      res += units[n];
    }
    return res.trim();
  };

  const currencyCode = settings?.defaultCurrencyCode || 'MAD';
  let mainUnitSingular = "dirham";
  let mainUnitPlural = "dirhams";
  let subUnitSingular = "centime";
  let subUnitPlural = "centimes";

  if (currencyCode === "DZD") {
    mainUnitSingular = "Algerian dinar";
    mainUnitPlural = "Algerian dinars";
    subUnitSingular = "centime";
    subUnitPlural = "centimes";
  } else if (currencyCode === "EUR") {
    mainUnitSingular = "euro";
    mainUnitPlural = "euros";
    subUnitSingular = "cent";
    subUnitPlural = "cents";
  } else if (currencyCode === "USD") {
    mainUnitSingular = "dollar";
    mainUnitPlural = "dollars";
    subUnitSingular = "cent";
    subUnitPlural = "cents";
  } else if (currencyCode === "GBP") {
    mainUnitSingular = "pound";
    mainUnitPlural = "pounds";
    subUnitSingular = "penny";
    subUnitPlural = "pence";
  }

  if (amount === 0) return `Zero ${mainUnitPlural}`;
  const integerPart = Math.floor(Math.abs(amount));
  const decimalPart = Math.round((Math.abs(amount) - integerPart) * 100);

  let words = "";
  let num = integerPart;
  let scaleIdx = 0;

  while (num > 0) {
    const group = num % 1000;
    if (group > 0) {
      words =
        convertGroup(group) +
        (scales[scaleIdx] ? " " + scales[scaleIdx] : "") +
        (words ? " " + words : "");
    }
    num = Math.floor(num / 1000);
    scaleIdx++;
  }

  let result = words.trim() + " " + (integerPart === 1 ? mainUnitSingular : mainUnitPlural);
  if (decimalPart > 0) {
    result += " and " + convertGroup(decimalPart) + " " + (decimalPart === 1 ? subUnitSingular : subUnitPlural);
  }

  return result.charAt(0).toUpperCase() + result.slice(1);
};

// --- Spanish Number to Words ---
const numberToWordsEs = (amount: number, settings?: CompanySettings | null): string => {
  const units = [
    "",
    "un",
    "dos",
    "tres",
    "cuatro",
    "cinco",
    "seis",
    "siete",
    "ocho",
    "nueve",
  ];
  const tens = [
    "",
    "diez",
    "veinte",
    "treinta",
    "cuarenta",
    "cincuenta",
    "sesenta",
    "setenta",
    "ochenta",
    "noventa",
  ];
  const special = {
    11: "once",
    12: "doce",
    13: "trece",
    14: "catorce",
    15: "quince",
    21: "veintiuno",
    22: "veintidós",
    23: "veintitrés",
    24: "veinticuatro",
    25: "veinticinco",
  };

  const convertGroup = (n: number): string => {
    if (n === 0) return "";
    if (n === 100) return "cien";
    let res = "";
    if (n >= 100) {
      const h = Math.floor(n / 100);
      if (h === 1) res += "ciento ";
      else if (h === 5) res += "quinientos ";
      else if (h === 7) res += "setecientos ";
      else if (h === 9) res += "novecientos ";
      else res += units[h] + "cientos ";
      n %= 100;
    }
    if (n > 0) {
      if ((special as any)[n]) res += (special as any)[n];
      else if (n >= 10 && n < 20) res += "dieci" + units[n - 10];
      else if (n >= 20 && n < 30) res += "veinti" + units[n - 20];
      else if (n >= 30) {
        res +=
          tens[Math.floor(n / 10)] +
          (n % 10 !== 0 ? " y " + units[n % 10] : "");
      } else {
        res += units[n];
      }
    }
    return res.trim();
  };

  const currencyCode = settings?.defaultCurrencyCode || 'MAD';
  let mainUnitSingular = "dirham";
  let mainUnitPlural = "dirhams";
  let subUnitSingular = "céntimo";
  let subUnitPlural = "céntimos";

  if (currencyCode === "DZD") {
    mainUnitSingular = "dinar argelino";
    mainUnitPlural = "dinares argelinos";
    subUnitSingular = "céntimo";
    subUnitPlural = "céntimos";
  } else if (currencyCode === "EUR") {
    mainUnitSingular = "euro";
    mainUnitPlural = "euros";
    subUnitSingular = "céntimo";
    subUnitPlural = "céntimos";
  } else if (currencyCode === "USD") {
    mainUnitSingular = "dólar";
    mainUnitPlural = "dólares";
    subUnitSingular = "centavo";
    subUnitPlural = "centavos";
  } else if (currencyCode === "GBP") {
    mainUnitSingular = "libra";
    mainUnitPlural = "libras";
    subUnitSingular = "penique";
    subUnitPlural = "peniques";
  }

  if (amount === 0) return `Cero ${mainUnitPlural}`;
  const integerPart = Math.floor(Math.abs(amount));
  const decimalPart = Math.round((Math.abs(amount) - integerPart) * 100);

  let words = "";
  if (integerPart === 0) words = "cero";
  else if (integerPart === 1) words = "un";
  else if (integerPart < 1000) words = convertGroup(integerPart);
  else {
    const thousands = Math.floor(integerPart / 1000);
    const remainder = integerPart % 1000;
    words =
      (thousands === 1 ? "mil" : convertGroup(thousands) + " mil") +
      " " +
      convertGroup(remainder);
  }

  let result = words.trim() + " " + (integerPart === 1 ? mainUnitSingular : mainUnitPlural);
  if (decimalPart > 0) {
    result += " con " + convertGroup(decimalPart) + " " + (decimalPart === 1 ? subUnitSingular : subUnitPlural);
  }

  return result.charAt(0).toUpperCase() + result.slice(1);
};
