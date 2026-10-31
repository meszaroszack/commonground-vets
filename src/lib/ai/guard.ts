export function numbersIn(text: string): string[] {
  return text.match(/\d+(?:\.\d+)?/g) ?? [];
}

/** Reject a model draft that introduces measurements the speaker never used. */
export function introducesNewNumbers(source: string, draft: string): boolean {
  const allowed = new Set(numbersIn(source));
  return numbersIn(draft).some((value) => !allowed.has(value));
}

export function stitchPersonalStatement(name: string, condition: string, userLines: string[]): string {
  const lines = userLines.map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return "";
  return [
    `My name is ${name}. I am describing ${condition} in my own words.`,
    "",
    ...lines.flatMap((line) => [line, ""]),
    "I have read this statement. It reflects what I personally experience. Nothing has been added that I did not describe.",
  ].join("\n");
}

export function stitchWitnessStatement(input: {
  witnessName: string;
  veteranName: string;
  relationshipLabel: string;
  condition: string;
  transcript: string;
}): string {
  return [
    `My name is ${input.witnessName}. I am the ${input.relationshipLabel.toLowerCase()} of ${input.veteranName}.`,
    `I am describing what I have personally seen regarding ${input.condition}.`,
    "",
    input.transcript.trim(),
    "",
    "This is based on what I have personally observed. I am not a clinician, and I have not added anything I did not see or hear.",
  ].join("\n");
}

export function userTranscript(turns: Array<{ role: string; content: string }>): string {
  return turns
    .filter((turn) => turn.role === "user")
    .map((turn) => turn.content.trim())
    .filter(Boolean)
    .join("\n");
}
