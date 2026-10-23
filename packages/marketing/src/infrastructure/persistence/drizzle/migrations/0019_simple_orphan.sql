CREATE INDEX "editorial_items_references_idx" ON "marketing"."editorial_items" USING gin ((
    coalesce("document"->'referenceIds', '[]'::jsonb) ||
    coalesce("document"->'evidenceIds', '[]'::jsonb) ||
    coalesce("document"->'representationIds', '[]'::jsonb) ||
    coalesce("document"->'componentIds', '[]'::jsonb) ||
    coalesce("document"->'pieceId', '[]'::jsonb) ||
    coalesce("document"->'representationId', '[]'::jsonb) ||
    coalesce("document"->'proposedPieceId', '[]'::jsonb)
  ));