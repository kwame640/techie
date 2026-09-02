import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Clock, CheckCircle, XCircle, LogOut, Eye, ChevronLeft, ChevronRight, X, Trash2, Image as ImageIcon, Upload, Loader2 } from 'lucide-react';
import logoImage from '../../images/nkay.png';

interface BusinessImage {
  id: string;
  businessRegistrationId: string;
  imageUrl: string;
  imageKey: string;
  originalName: string;
  createdAt: string;
}

interface Registration {
  id: string;
  businessName: string;
  businessType: string;
  businessCategory: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  country: string;
  preferredContactMethod: string;
  description: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  registrationDate: string;
  imageCount?: number;
  images?: BusinessImage[];
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export const AdminDashboard = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [selectedImages, setSelectedImages] = useState<BusinessImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchData();
  }, [token, navigate]);

  const fetchData = async () => {
    try {
      const [regRes, statsRes] = await Promise.all([
        fetch('/api/registrations', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/stats', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const regData = await regRes.json();
      const statsData = await statsRes.json();

      if (regData.success) setRegistrations(regData.registrations);
      if (statsData.success) setStats(statsData.stats);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRegistrationDetails = async (id: string) => {
    try {
      const response = await fetch(`/api/registrations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setSelectedRegistration(data.registration);
        setSelectedImages(data.registration.images || []);
      }
    } catch (error) {
      console.error('Failed to fetch registration details:', error);
    }
  };

  const handleStatusChange = async (id: string, status: 'Pending' | 'Approved' | 'Rejected') => {
    try {
      const response = await fetch(`/api/registrations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();
      if (data.success) {
        fetchData();
        setSelectedRegistration(null);
        setSelectedImages([]);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setSelectedImages(selectedImages.filter(img => img.id !== imageId));
        if (selectedRegistration) {
          setSelectedRegistration({
            ...selectedRegistration,
            images: selectedRegistration.images?.filter(img => img.id !== imageId)
          });
        }
        fetchData();
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  };

  const readFileAsDataUrl = (file: File): Promise<{ name: string; type: string; dataUrl: string }> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, type: file.type, dataUrl: reader.result as string });
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  const handleUploadImages = async (files: FileList | File[]) => {
    if (!selectedRegistration) return;
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    for (const f of fileArray) {
      if (!allowed.includes(f.type)) {
        setUploadError(`Unsupported file type: ${f.type}`);
        return;
      }
    }

    setIsUploading(true);
    setUploadError('');

    try {
      const imagesPayload = await Promise.all(fileArray.map(readFileAsDataUrl));

      const response = await fetch('/api/images/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          registrationId: selectedRegistration.id,
          images: imagesPayload,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSelectedImages([...selectedImages, ...data.images]);
        if (selectedRegistration) {
          setSelectedRegistration({
            ...selectedRegistration,
            images: [...(selectedRegistration.images || []), ...data.images],
          });
        }
        fetchData();
      } else {
        setUploadError(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Failed to upload images');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleUploadImages(e.target.files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) handleUploadImages(e.dataTransfer.files);
  };

  const handleViewRegistration = (reg: Registration) => {
    setSelectedRegistration(reg);
    fetchRegistrationDetails(reg.id);
  };

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % selectedImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + selectedImages.length) % selectedImages.length);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    navigate('/admin/login');
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      Pending: 'bg-yellow-100 text-yellow-800',
      Approved: 'bg-green-100 text-green-800',
      Rejected: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoImage} alt="NKAY" className="h-10 w-auto" />
            <span className="text-xl font-bold text-primary">Admin Dashboard</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-text-light hover:text-primary transition"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-text-light">Total</p>
                <p className="text-2xl font-bold text-text">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-text-light">Pending</p>
                <p className="text-2xl font-bold text-text">{stats.pending}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-text-light">Approved</p>
                <p className="text-2xl font-bold text-text">{stats.approved}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-text-light">Rejected</p>
                <p className="text-2xl font-bold text-text">{stats.rejected}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-text">Business Registrations</h2>
          </div>
          {registrations.length === 0 ? (
            <div className="p-12 text-center text-text-light">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No registrations yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase">Business</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase">Photos</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {registrations.map(reg => (
                    <tr key={reg.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-text">{reg.businessName}</p>
                        <p className="text-sm text-text-light">{reg.businessType}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-text-light">{reg.businessCategory}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-text">{reg.email}</p>
                        <p className="text-sm text-text-light">{reg.phone}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-text">{reg.city}</p>
                        <p className="text-sm text-text-light">{reg.region}</p>
                      </td>
                      <td className="px-6 py-4">
                        {reg.imageCount && reg.imageCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                            <ImageIcon className="w-3 h-3" />
                            {reg.imageCount} Photos
                          </span>
                        ) : (
                          <span className="text-sm text-text-light">No photos</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-light">{formatDate(reg.registrationDate)}</td>
                      <td className="px-6 py-4">{getStatusBadge(reg.status)}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleViewRegistration(reg)}
                          className="text-primary hover:text-primary-light transition"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedRegistration && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="text-lg font-semibold text-text">Registration Details</h3>
              <button
                onClick={() => {
                  setSelectedRegistration(null);
                  setSelectedImages([]);
                }}
                className="text-text-light hover:text-text w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-text-light">Business Name</p>
                  <p className="font-medium text-text">{selectedRegistration.businessName}</p>
                </div>
                <div>
                  <p className="text-sm text-text-light">Business Type</p>
                  <p className="font-medium text-text">{selectedRegistration.businessType}</p>
                </div>
                <div>
                  <p className="text-sm text-text-light">Category</p>
                  <p className="font-medium text-text">{selectedRegistration.businessCategory}</p>
                </div>
                <div>
                  <p className="text-sm text-text-light">Email</p>
                  <p className="font-medium text-text">{selectedRegistration.email}</p>
                </div>
                <div>
                  <p className="text-sm text-text-light">Phone</p>
                  <p className="font-medium text-text">{selectedRegistration.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-text-light">Address</p>
                  <p className="font-medium text-text">{selectedRegistration.address || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-text-light">City</p>
                  <p className="font-medium text-text">{selectedRegistration.city || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-text-light">Region</p>
                  <p className="font-medium text-text">{selectedRegistration.region || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-text-light">Country</p>
                  <p className="font-medium text-text">{selectedRegistration.country || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-text-light">Preferred Contact</p>
                  <p className="font-medium text-text">{selectedRegistration.preferredContactMethod}</p>
                </div>
                <div>
                  <p className="text-sm text-text-light">Registration Date</p>
                  <p className="font-medium text-text">{formatDate(selectedRegistration.registrationDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-text-light">Status</p>
                  {getStatusBadge(selectedRegistration.status)}
                </div>
              </div>
              <div>
                <p className="text-sm text-text-light">Description</p>
                <p className="text-text">{selectedRegistration.description || 'No description provided'}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-text mb-3">Business Photos ({selectedImages.length})</p>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  className={`mb-4 border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
                    isDragOver ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2 text-primary">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <p className="text-sm font-medium">Uploading...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-text-light">
                      <Upload className="w-8 h-8" />
                      <p className="text-sm font-medium text-text">Click or drag images here to upload</p>
                      <p className="text-xs">JPG, PNG, WEBP, GIF • Max 20 photos total</p>
                    </div>
                  )}
                  {uploadError && (
                    <p className="mt-2 text-sm text-red-600">{uploadError}</p>
                  )}
                </div>
                {selectedImages.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {selectedImages.map((img, index) => (
                      <div key={img.id} className="relative group">
                        <div
                          className="aspect-square rounded-lg overflow-hidden border border-gray-200 cursor-pointer"
                          onClick={() => openLightbox(index)}
                        >
                          <img
                            src={img.imageUrl}
                            alt={`Business photo ${index + 1}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                          />
                        </div>
                        <button
                          onClick={() => handleDeleteImage(img.id)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          title="Delete image"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex gap-3 sticky bottom-0">
              <button
                onClick={() => handleStatusChange(selectedRegistration.id, 'Approved')}
                className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
              >
                Approve
              </button>
              <button
                onClick={() => handleStatusChange(selectedRegistration.id, 'Rejected')}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
              >
                Reject
              </button>
              <button
                onClick={() => handleStatusChange(selectedRegistration.id, 'Pending')}
                className="flex-1 py-2 px-4 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition"
              >
                Set Pending
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxOpen && selectedImages.length > 0 && (
        <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center">
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition z-10"
          >
            <X className="w-8 h-8" />
          </button>

          {selectedImages.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition z-10 p-2 rounded-full hover:bg-white/10"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition z-10 p-2 rounded-full hover:bg-white/10"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}

          <div className="max-w-5xl max-h-[90vh] p-4">
            <img
              src={selectedImages[currentImageIndex].imageUrl}
              alt={`Business photo ${currentImageIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain mx-auto"
            />
            <div className="text-center mt-4 text-white">
              <p className="text-sm text-gray-400">
                {currentImageIndex + 1} of {selectedImages.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {selectedImages[currentImageIndex].originalName}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
