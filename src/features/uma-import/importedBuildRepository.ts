import { IndexedDbRepository } from "../../components/indexedDbRepository";
import type { ImportedUmaBuild, StoredImportedUmaBuild } from "../../types/UmaBuild";
import { isImportedUmaBuild } from "../../types/UmaBuild";

const IMPORTED_BUILDS_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const importedBuildRepository = new IndexedDbRepository<StoredImportedUmaBuild>({
  databaseName: "UmaImport",
  version: 1,
  storeName: "builds",
  keyPath: "id",
});

export async function clearImportedBuilds() {
  const storedBuilds = await importedBuildRepository.getAll();
  await Promise.all(
    storedBuilds.map((build) => importedBuildRepository.deleteByKey(build.id)),
  );
}

export async function loadStoredBuilds(): Promise<ImportedUmaBuild[]> {
  const storedBuilds = await importedBuildRepository.getAll();
  if (storedBuilds.length === 0) {
    return [];
  }

  const now = Date.now();
  const validBuilds = storedBuilds.filter(
    (build) =>
      build.importedAt <= now &&
      now - build.importedAt < IMPORTED_BUILDS_MAX_AGE &&
      isImportedUmaBuild(build),
  );
  if (validBuilds.length !== storedBuilds.length) {
    await clearImportedBuilds();
    await importedBuildRepository.addMany(validBuilds);
  }

  return validBuilds;
}

export async function saveImportedBuilds(builds: ImportedUmaBuild[], importedAt: number) {
  await clearImportedBuilds();
  await importedBuildRepository.addMany(
    builds.map((build, index) => ({
      ...build,
      id: `${importedAt}-${index}`,
      importedAt,
    })),
  );
}
