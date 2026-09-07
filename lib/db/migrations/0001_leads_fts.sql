CREATE VIRTUAL TABLE leads_fts USING fts5(
  name,
  formatted_address,
  notes,
  content='leads',
  content_rowid='id'
);--> statement-breakpoint
CREATE TRIGGER leads_fts_insert AFTER INSERT ON leads BEGIN
  INSERT INTO leads_fts(rowid, name, formatted_address, notes)
  VALUES (new.id, new.name, new.formatted_address, new.notes);
END;--> statement-breakpoint
CREATE TRIGGER leads_fts_delete AFTER DELETE ON leads BEGIN
  INSERT INTO leads_fts(leads_fts, rowid, name, formatted_address, notes)
  VALUES ('delete', old.id, old.name, old.formatted_address, old.notes);
END;--> statement-breakpoint
CREATE TRIGGER leads_fts_update AFTER UPDATE OF name, formatted_address, notes ON leads BEGIN
  INSERT INTO leads_fts(leads_fts, rowid, name, formatted_address, notes)
  VALUES ('delete', old.id, old.name, old.formatted_address, old.notes);
  INSERT INTO leads_fts(rowid, name, formatted_address, notes)
  VALUES (new.id, new.name, new.formatted_address, new.notes);
END;--> statement-breakpoint
INSERT INTO leads_fts(rowid, name, formatted_address, notes)
SELECT id, name, formatted_address, notes FROM leads;
