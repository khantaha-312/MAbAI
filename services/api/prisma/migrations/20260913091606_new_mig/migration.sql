-- CreateIndex
CREATE INDEX "ChatMessage_consolidatedAt_idx" ON "ChatMessage"("consolidatedAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_userId_resolvedAt_idx" ON "LedgerEntry"("userId", "resolvedAt");
