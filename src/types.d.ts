// Minimal type declarations for @natlibfi/fixugen (test-only dependency,
// no published types). Types only what this package's tests use.
declare module '@natlibfi/fixugen' {
  export interface FixugenTestConfig {
    testType: string;
    getFixture: (fixtureName: string) => Record<string, unknown>;
    arrayOfKeysWanted?: string[];
  }

  export interface FixugenOptions {
    callback: (testConf: FixugenTestConfig) => void;
    path: string[];
    recurse?: boolean;
    useMetadataFile?: boolean;
    fixura?: Record<string, unknown>;
  }

  export default function generateTests(options: FixugenOptions): void;
}
