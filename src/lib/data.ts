import { IndexedDbRepository } from "../components/indexedDbRepository";

type ManifestDataset = {
  path: string;
  version: number | string;
  sha256: string;
};

type DataManifest = {
  data: Record<string, ManifestDataset>;
};

type VersionedDataFile<T> = {
  sha256: string;
  data: T;
};

type CachedDataset = {
  name: string;
  path: string;
  version: number | string;
  sha256: string;
  data: unknown;
};

export type LoadedData = Record<string, unknown>;

const dataRepository = new IndexedDbRepository<CachedDataset>({
  databaseName: "R2DataDB",
  version: 1,
  storeName: "datasets",
  keyPath: "name",
});

let dataLoadPromise: Promise<LoadedData> | null = null;

function normalizeSha256(sha256: string): string {
  return sha256.replace(/^sha256:/i, "").trim().toLowerCase();
}

function getDataUrl(baseUrl: string, path: string): string {
  return `${baseUrl}/${path.replace(/^\/+/, "")}`;
}

async function fetchManifest(baseUrl: string): Promise<DataManifest> {
  const manifestUrl = `${baseUrl}/manifest.json?cacheBust=${Date.now()}`;
  const response = await fetch(manifestUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Unable to load data manifest from ${manifestUrl}`);
  }

  return (await response.json()) as DataManifest;
}

async function fetchDataset(
  baseUrl: string,
  name: string,
  manifestDataset: ManifestDataset,
  cachedDataset: CachedDataset | undefined,
): Promise<CachedDataset> {
  if (
    cachedDataset &&
    normalizeSha256(cachedDataset.sha256) ===
      normalizeSha256(manifestDataset.sha256) &&
    cachedDataset.path === manifestDataset.path
  ) {
    return cachedDataset;
  }

  const dataUrl = `${getDataUrl(baseUrl, manifestDataset.path)}?sha256=${encodeURIComponent(
    manifestDataset.sha256,
  )}`;
  const response = await fetch(dataUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Unable to load ${name} data from ${dataUrl}`);
  }

  const versionedFile = (await response.json()) as VersionedDataFile<unknown>;

  if (
    typeof versionedFile.sha256 !== "string" ||
    normalizeSha256(versionedFile.sha256) !==
      normalizeSha256(manifestDataset.sha256)
  ) {
    throw new Error(
      `SHA mismatch for ${name}: manifest has "${manifestDataset.sha256}", file has "${versionedFile.sha256}"`,
    );
  }

  return {
    name,
    path: manifestDataset.path,
    version: manifestDataset.version,
    sha256: versionedFile.sha256,
    data: versionedFile.data,
  };
}

export async function ensureDataLoaded(): Promise<LoadedData> {
  if (!dataLoadPromise) {
    dataLoadPromise = loadDataFromR2();
  }

  try {
    return await dataLoadPromise;
  } finally {
    dataLoadPromise = null;
  }
}

export async function loadDataFromR2(): Promise<LoadedData> {
  const baseUrl = import.meta.env.VITE_R2_BASE_URL?.replace(/\/$/, "");

  if (!baseUrl) {
    throw new Error("VITE_R2_BASE_URL is not configured");
  }

  const [manifest, cachedDatasets] = await Promise.all([
    fetchManifest(baseUrl),
    dataRepository.getAll(),
  ]);
  const cachedByName = new Map(
    cachedDatasets.map((dataset) => [dataset.name, dataset]),
  );
  const datasetEntries = Object.entries(manifest.data).filter(
    ([, dataset]) =>
      typeof dataset.path === "string" &&
      dataset.path.length > 0 &&
      dataset.version !== undefined &&
      typeof dataset.sha256 === "string",
  );

  const loadedData: LoadedData = {};
  const updatedDatasets = await Promise.all(
    datasetEntries.map(([name, manifestDataset]) =>
      fetchDataset(baseUrl, name, manifestDataset, cachedByName.get(name)),
    ),
  );

  await Promise.all(
    updatedDatasets.map(async (dataset) => {
      loadedData[dataset.name] = dataset.data;
      await dataRepository.put(dataset);
    }),
  );

  const currentNames = new Set(updatedDatasets.map((dataset) => dataset.name));
  await Promise.all(
    cachedDatasets
      .filter((dataset) => !currentNames.has(dataset.name))
      .map((dataset) => dataRepository.deleteByKey(dataset.name)),
  );

  return loadedData;
}

export async function getCachedDataset<T>(name: string): Promise<T | null> {
  const dataset = await dataRepository.getByKey(name);
  return (dataset?.data as T | undefined) ?? null;
}
