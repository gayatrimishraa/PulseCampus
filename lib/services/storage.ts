/**
 * Image uploads are currently disabled because this project
 * uses the Firebase Spark plan without Cloud Storage.
 *
 * Report creation should pass imageUrls: [].
 */

export async function uploadReportImages(
  imageUris: string[]
): Promise<string[]> {
  if (imageUris.length > 0) {
    throw new Error(
      'Report image uploads are currently unavailable. ' +
      'Please submit the report without images.'
    );
  }

  return [];
}