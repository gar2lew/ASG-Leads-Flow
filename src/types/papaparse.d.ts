declare module "papaparse" {
  interface ParseConfig {
    delimiter?: string;
    newline?: string;
    quoteChar?: string;
    escapeChar?: string;
    header?: boolean;
    dynamicTyping?: boolean;
    preview?: number;
    encoding?: string;
    worker?: boolean;
    comments?: boolean | string;
    download?: boolean;
    skipEmptyLines?: boolean | "greedy";
    fastMode?: boolean;
    transformHeader?: (header: string) => string;
    transform?: (value: string, field: string | number) => any;
    error?: (error: any, file?: any) => void;
    complete?: (results: any, file?: any) => void;
    step?: (results: any, parser: any) => void;
  }

  interface ParseError {
    type: string;
    code: string;
    message: string;
    row?: number;
  }

  interface ParseResult<T = any> {
    data: T[];
    errors: ParseError[];
    meta: {
      delimiter: string;
      linebreak: string;
      aborted: boolean;
      truncated: boolean;
      cursor: number;
      fields?: string[];
    };
  }

  interface PapaParseDefault {
    parse: typeof parse;
    unparse: typeof unparse;
  }

  function parse(input: string, config?: ParseConfig): ParseResult;
  function unparse(data: any, config?: any): string;

  const papa: PapaParseDefault;
  export default papa;
  export { parse, unparse };
}
