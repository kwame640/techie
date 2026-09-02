import { getImageById, deleteImage as deleteImageFromDb } from '../../../server/models/businessImageModel.js';
import { deleteImage as deleteImageFile } from '../../../server/services/imageService.js';

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const { id } = req.query;

  try {
    const image = getImageById(id);
    if (!image) {
      return res.status(404).json({ success: false, error: 'Image not found' });
    }

    await deleteImageFile(image.imageKey);
    deleteImageFromDb(id);

    return res.status(200).json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete image' });
  }
}
