export interface SourceLike {
  id: string;
  url: string;
}

export interface PipelineResult {
  sourceId: string;
  success: boolean;
  itemsFound: number;
  itemsInserted: number;
  itemsDuplicate: number;
  itemsRejected: number;
  httpStatus?: number;
  errorMessage?: string;
  durationMs: number;
}

export interface PersistOutcome {
  insertedCount: number;
  duplicateCount: number;
}

export interface SourceAdapter<TSource extends SourceLike, TRawItem, TNormalized> {
  fetch(source: TSource): Promise<{ httpStatus?: number; rawItems: TRawItem[] }>;
  validate(rawItem: TRawItem): boolean;
  normalize(rawItem: TRawItem, source: TSource): TNormalized;
  persist(source: TSource, normalizedItems: TNormalized[]): Promise<PersistOutcome>;
}
