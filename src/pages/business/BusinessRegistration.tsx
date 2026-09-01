import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Store, Mail, Phone, MapPin, Check, X, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface UploadedImage {
  file: File;
  preview: string;
  id: string;
}

export const BusinessRegistration = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageErrors, setImageErrors] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    businessCategory: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    region: '',
    country: 'Ghana',
    preferredContactMethod: 'email',
    description: '',
  });
  const [businessImages, setBusinessImages] = useState<UploadedImage[]>([]);

  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const MAX_IMAGES = 5;
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: '',
      });
    }
  };

  const validateImage = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `${file.name}: Invalid file type. Only JPG, PNG, WEBP allowed.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: File too large. Maximum 5MB per image.`;
    }
    return null;
  };

  const handleFilesAdd = (files: FileList | null) => {
    if (!files) return;

    const newErrors: string[] = [];
    const validFiles: UploadedImage[] = [];

    const remainingSlots = MAX_IMAGES - businessImages.length;
    if (remainingSlots <= 0) {
      setImageErrors([`Maximum ${MAX_IMAGES} images allowed.`]);
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      newErrors.push(`Only ${remainingSlots} more image(s) allowed. First ${remainingSlots} selected.`);
    }

    filesToProcess.forEach((file) => {
      const error = validateImage(file);
      if (error) {
        newErrors.push(error);
      } else {
        validFiles.push({
          file,
          preview: URL.createObjectURL(file),
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        });
      }
    });

    setBusinessImages([...businessImages, ...validFiles]);
    setImageErrors(newErrors);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFilesAdd(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (id: string) => {
    setBusinessImages(businessImages.filter((img) => {
      if (img.id === id) {
        URL.revokeObjectURL(img.preview);
        return false;
      }
      return true;
    }));
    setImageErrors([]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFilesAdd(e.dataTransfer.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadProgress(0);
    setImageErrors([]);

    try {
      const formDataToSend = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value);
      });

      businessImages.forEach((img) => {
        formDataToSend.append('businessImages', img.file);
      });

      const totalSteps = 10;
      let currentStep = 0;
      const updateProgress = () => {
        currentStep++;
        setUploadProgress(Math.round((currentStep / totalSteps) * 100));
      };

      updateProgress();

      const xhr = new XMLHttpRequest();

      const uploadPromise = new Promise<{ success: boolean; error?: string }>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percentComplete);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(xhr.responseText));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

        xhr.open('POST', 'http://localhost:3001/api/business/register');
        xhr.send(formDataToSend);
      });

      const result = await uploadPromise;

      if (result.success) {
        setIsSuccess(true);
      } else {
        setImageErrors([result.error || 'Registration failed']);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      try {
        const errorData = JSON.parse(error.message);
        setImageErrors([errorData.error || 'Registration failed. Please try again.']);
      } catch {
        setImageErrors(['Registration failed. Please try again.']);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.businessName.trim()) {
        newErrors.businessName = 'Business name is required';
      }
      if (!formData.businessType) {
        newErrors.businessType = 'Business type is required';
      }
      if (!formData.businessCategory) {
        newErrors.businessCategory = 'Business category is required';
      }
    }

    if (currentStep === 2) {
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email';
      }
      if (formData.phone.trim()) {
        const digitsOnly = formData.phone.replace(/\D/g, '');
        if (digitsOnly.length !== 10) {
          newErrors.phone = 'Phone number must be exactly 10 digits';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step) && step < 3) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src="/src/images/nkay.png" alt="NKAY" className="h-8 w-auto" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Register Your Business</h1>
          <p className="text-text-light text-lg">Join NKAY and start selling to thousands of customers</p>
        </div>

        <div className="flex items-center justify-center mb-12">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= s ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step >= s ? <Check className="w-5 h-5" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-24 h-1 mx-2 ${step > s ? 'bg-primary' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {isSuccess ? (
          <div className="bg-white rounded-2xl shadow-card p-12 text-center">
            <div className="mb-8">
              <div className="relative w-32 h-32 mx-auto">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="4"
                    className="animate-draw-circle"
                  />
                  <path
                    d="M30 50 L45 65 L70 35"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="animate-draw-check"
                  />
                </svg>
              </div>
            </div>
            
            <h2 className="text-3xl font-bold text-green-600 mb-4">Registration Successful!</h2>
            <p className="text-text-light text-lg mb-8">
              Your business registration has been submitted successfully. Our team will review your application within 24-48 hours.
            </p>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-green-800 mb-3">What's Next?</h3>
              <ul className="text-left space-y-2 text-green-700">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Check your email for confirmation details</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Complete your store setup after approval</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Start adding your products</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Begin selling to thousands of customers</span>
                </li>
              </ul>
            </div>
            
            <button
              onClick={() => navigate('/login')}
              className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition font-medium"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-card p-8">
            <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold mb-6">Basic Information</h2>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Business Name *</label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                        errors.businessName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your business name"
                      required
                    />
                  </div>
                  {errors.businessName && (
                    <p className="mt-1 text-sm text-red-500">{errors.businessName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Business Type *</label>
                  <select
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                      errors.businessType ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  >
                    <option value="">Select business type</option>
                    <option value="retail">Retail Store</option>
                    <option value="restaurant">Restaurant/Food Service</option>
                    <option value="electronics">Electronics</option>
                    <option value="fashion">Fashion & Apparel</option>
                    <option value="grocery">Grocery</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.businessType && (
                    <p className="mt-1 text-sm text-red-500">{errors.businessType}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Business Category *</label>
                  <select
                    name="businessCategory"
                    value={formData.businessCategory}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                      errors.businessCategory ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  >
                    <option value="">Select business category</option>
                    <option value="food">Food & Beverages</option>
                    <option value="fashion">Fashion & Clothing</option>
                    <option value="electronics">Electronics & Gadgets</option>
                    <option value="home">Home & Furniture</option>
                    <option value="beauty">Beauty & Personal Care</option>
                    <option value="health">Health & Wellness</option>
                    <option value="sports">Sports & Outdoors</option>
                    <option value="books">Books & Stationery</option>
                    <option value="automotive">Automotive</option>
                    <option value="services">Services</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.businessCategory && (
                    <p className="mt-1 text-sm text-red-500">{errors.businessCategory}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Business Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Tell us about your business..."
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold mb-6">Contact Information</h2>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="business@example.com"
                      required
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                        errors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="+233 50 123 4567"
                    />
                  </div>
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Address (Optional)</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Street address"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">City (Optional)</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Accra, Kumasi, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Region (Optional)</label>
                  <select
                    name="region"
                    value={formData.region}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select region</option>
                    <option value="Greater Accra">Greater Accra</option>
                    <option value="Ashanti">Ashanti</option>
                    <option value="Eastern">Eastern</option>
                    <option value="Western">Western</option>
                    <option value="Central">Central</option>
                    <option value="Northern">Northern</option>
                    <option value="Upper East">Upper East</option>
                    <option value="Upper West">Upper West</option>
                    <option value="Volta">Volta</option>
                    <option value="Bono East">Bono East</option>
                    <option value="Ahafo">Ahafo</option>
                    <option value="Oti">Oti</option>
                    <option value="North East">North East</option>
                    <option value="Savannah">Savannah</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Country (Optional)</label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select country</option>
                    <option value="Ghana">Ghana</option>
                    <option value="Nigeria">Nigeria</option>
                    <option value="Kenya">Kenya</option>
                    <option value="South Africa">South Africa</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Preferred Contact Method *</label>
                  <select
                    name="preferredContactMethod"
                    value={formData.preferredContactMethod}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  >
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Business Photos</h2>
                  <p className="text-text-light mb-6">Upload photos that show your business, products, storefront, services, or workspace.</p>
                </div>

                {imageErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        {imageErrors.map((err, idx) => (
                          <p key={idx} className="text-sm text-red-600">{err}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                    isDragOver
                      ? 'border-primary bg-primary/5'
                      : businessImages.length >= MAX_IMAGES
                      ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                      : 'border-gray-300 hover:border-primary hover:bg-primary/5'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => businessImages.length < MAX_IMAGES && fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleImageUpload}
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple
                    className="hidden"
                    id="business-images-upload"
                    disabled={businessImages.length >= MAX_IMAGES}
                  />
                  
                  <div className="flex flex-col items-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                      isDragOver ? 'bg-primary/10' : 'bg-gray-100'
                    }`}>
                      <ImageIcon className={`w-8 h-8 ${isDragOver ? 'text-primary' : 'text-gray-400'}`} />
                    </div>
                    
                    {isDragOver ? (
                      <p className="text-primary font-medium mb-2">Drop images here</p>
                    ) : (
                      <>
                        <p className="text-text mb-2">
                          <span className="text-primary font-medium">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-sm text-text-light">
                          JPG, PNG, WEBP • Max 5MB each • Up to {MAX_IMAGES} photos
                        </p>
                      </>
                    )}
                    
                    <div className="mt-4 text-sm text-text-light">
                      {businessImages.length} / {MAX_IMAGES} photos
                    </div>
                  </div>
                </div>

                {businessImages.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-text">Selected Photos</h3>
                      <span className="text-sm text-text-light">{businessImages.length} of {MAX_IMAGES}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {businessImages.map((img, index) => (
                        <div
                          key={img.id}
                          className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 shadow-sm"
                        >
                          <img
                            src={img.preview}
                            alt={`Business photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeImage(img.id);
                              }}
                              className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                            {(img.file.size / 1024 / 1024).toFixed(1)} MB
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-light">Uploading...</span>
                      <span className="font-medium">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="bg-accent-beige rounded-lg p-6">
                  <h3 className="font-semibold mb-2">What happens next?</h3>
                  <ul className="space-y-2 text-sm text-text-light">
                    <li>• Your application will be reviewed within 24-48 hours</li>
                    <li>• You'll receive a confirmation email with next steps</li>
                    <li>• Once approved, you can start adding products</li>
                    <li>• Our team will help you set up your store</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Previous
                </button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Submit Registration'
                  )}
                </button>
              )}
            </div>
          </form>
          </div>
        )}

        {!isSuccess && (
          <div className="text-center mt-8 text-sm text-text-light">
            <p>By registering, you agree to our <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link></p>
          </div>
        )}
      </main>
    </div>
  );
};
