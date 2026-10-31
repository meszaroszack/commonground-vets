import "server-only";
import { Paper } from "./layout";

export type Form2110210Input = {
  role: "veteran" | "witness";
  veteranName: string;
  vaFileNumber: string | null;
  conditionName: string;
  statement: string;
  witnessName?: string;
  relationshipLabel?: string;
  witnessEmail?: string;
  witnessPhone?: string;
  signaturePng?: Uint8Array | null;
  signedAtIso: string;
};

export async function buildForm2110210(input: Form2110210Input): Promise<Uint8Array> {
  const paper = await Paper.create("VA Form 21-10210 preparation copy");
  paper.heading("Lay / witness statement");
  paper.paragraph(
    "Prepared in the section order of VA Form 21-10210 for the signer to review and file themselves. This is not a VA-issued form and it is not a decision. Compare it with the current official form at VA.gov before you submit.",
  );
  paper.heading("Veteran identification");
  paper.label("Veteran name");
  paper.paragraph(input.veteranName || "Not provided");
  paper.label("VA file number");
  paper.paragraph(input.vaFileNumber?.trim() || "Not entered in Common Ground. Add it before you file, or use the number VA already has.");
  paper.label("Condition this statement is about");
  paper.paragraph(input.conditionName);

  paper.heading(input.role === "witness" ? "Item 17 — witness statement" : "Personal statement");
  paper.paragraph(input.statement.trim() || "No statement text was provided.");

  paper.heading("Relationship and contact");
  if (input.role === "veteran") {
    paper.paragraph("I am the veteran named above. I wrote this statement about my own condition.");
  } else {
    paper.label("Witness name");
    paper.paragraph(input.witnessName || "Not provided");
    paper.label("Relationship to the veteran");
    paper.paragraph(input.relationshipLabel || "Not provided");
    paper.label("Email");
    paper.paragraph(input.witnessEmail || "Not provided");
    paper.label("Phone");
    paper.paragraph(input.witnessPhone || "Not provided");
  }

  paper.heading("Statement of truth");
  paper.paragraph(
    "I certify that the statements in this preparation copy are true and correct to the best of my knowledge and belief. I understand false statements to the government can be punished. I have read every word and I can edit anything that is not mine before this is filed.",
  );
  paper.label("Signed at");
  paper.paragraph(input.signedAtIso);
  await paper.drawSignature(input.signaturePng);
  paper.paragraph(
    "Common Ground does not charge a fee and does not submit this document unless the veteran separately chooses a VA Lighthouse or VA.gov upload.",
  );
  return paper.finish();
}
