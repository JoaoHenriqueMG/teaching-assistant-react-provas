/** STAND-IN written from the integration guide; keep the integrated branch's version when merging. */
export interface Alternative {
  text: string;
  isTrue: boolean;
}

export interface Question {
  code: string;
  subject: string;
  statement: string;
  alternatives: Alternative[];
}
