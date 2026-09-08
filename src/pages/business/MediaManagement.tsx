import { ChangeEvent, DragEvent, useState } from 'react';
import { Image as ImageIcon, Plus, Trash2, Upload } from 'lucide-react';
import { PageHeading, VendorLayout } from '../../components/VendorLayout';

type MediaKind = 'Store logo' | 'Store banner' | 'Product image' | 'Promotional image';
interface MediaItem { id: string; name: string; kind: MediaKind; url: string; }

const starterMedia: MediaItem[] = [
  { id: 'logo', name: 'Store logo', kind: 'Store logo', url: '' },
  { id: 'banner', name: 'Store banner', kind: 'Store banner', url: '' },
];

export const MediaManagement = () => {
  const [media, setMedia] = useState<MediaItem[]>(starterMedia);
  const [isDragging, setIsDragging] = useState(false);

  const addFiles = (files: FileList | File[]) => {
    Array.from(files).filter((file) => file.type.startsWith('image/')).forEach((file) => {
      setMedia((current) => [...current, { id: `${file.name}-${Date.now()}`, name: file.name, kind: 'Product image', url: URL.createObjectURL(file) }]);
    });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => { if (event.target.files) addFiles(event.target.files); };
  const handleDrop = (event: DragEvent<HTMLLabelElement>) => { event.preventDefault(); setIsDragging(false); addFiles(event.dataTransfer.files); };

  return <VendorLayout title="Media"><PageHeading title="Store Media" description="Keep your store images in one simple place." action={<label className="inline-flex items-center gap-2 bg-[#6f3d27] text-white px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"><Plus className="w-4 h-4" />Upload Images<input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} /></label>} /><label onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop} className={`flex flex-col items-center justify-center min-h-44 rounded-2xl border-2 border-dashed cursor-pointer transition ${isDragging ? 'border-[#6f3d27] bg-[#f7f1ed]' : 'border-[#d7c7bd] bg-white hover:bg-[#fcfaf9]'}`}><Upload className="w-8 h-8 text-[#8a553a]" /><p className="font-semibold mt-3">Upload product or store images</p><p className="text-xs text-[#927f74] mt-1">Drag and drop images here, or click to browse</p><input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} /></label><div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 mt-7">{media.map((item) => <div key={item.id} className="bg-white border border-[#eee5df] rounded-2xl overflow-hidden"><div className="aspect-[4/3] bg-[#f5ebe5] flex items-center justify-center">{item.url ? <img src={item.url} alt={item.name} className="w-full h-full object-cover" /> : <ImageIcon className="w-9 h-9 text-[#b89582]" />}</div><div className="p-4"><p className="text-sm font-semibold truncate">{item.name}</p><p className="text-xs text-[#927f74] mt-1">{item.kind}</p><div className="flex items-center gap-3 mt-4"><label className="text-xs font-semibold text-[#6f3d27] cursor-pointer">Replace<input type="file" accept="image/*" className="hidden" onChange={(event) => { if (event.target.files?.[0]) { const file = event.target.files[0]; setMedia((current) => current.map((entry) => entry.id === item.id ? { ...entry, name: file.name, url: URL.createObjectURL(file) } : entry)); } }} /></label><button onClick={() => setMedia((current) => current.filter((entry) => entry.id !== item.id))} className="text-xs text-[#a23d35] inline-flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" />Delete</button></div></div></div>)}</div></VendorLayout>;
};
