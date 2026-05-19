# Registration Page File Upload Updates

## Status: ⏳ IN PROGRESS

The registration page needs file upload fields added for ID documents and selfies.

## Changes Made So Far:

✅ Added imports: `Upload, Camera, X` icons
✅ Added file upload state variables to MemberSignupForm
✅ Added file upload handler functions

## Still Need to Add:

### In MemberSignupForm (around line 340):

**After the Phone Number field, add these two upload fields:**

```tsx
{/* ID Document Upload */}
<div>
  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
    ID Document <span className="text-red-500">*</span>
  </label>
  <p className="text-[10px] text-slate-600 mb-2">
    Upload your SA ID, Passport, or Driver's Licence
  </p>
  {!idDocumentPreview ? (
    <label className="block w-full border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:border-emerald-500 transition-colors">
      <input
        type="file"
        accept="image/jpeg,image/png,image/jpg,application/pdf"
        onChange={handleIdDocumentChange}
        required
        className="hidden"
      />
      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
      <p className="text-xs text-slate-600 font-semibold">Click to upload</p>
      <p className="text-[10px] text-slate-500 mt-1">JPG, PNG or PDF (max 5MB)</p>
    </label>
  ) : (
    <div className="relative border-2 border-emerald-500 rounded-lg p-2">
      {idDocument?.type === 'application/pdf' ? (
        <div className="flex items-center gap-2 p-2">
          <div className="bg-red-100 p-2 rounded">
            <span className="text-xs font-bold text-red-600">PDF</span>
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-900">{idDocument.name}</p>
            <p className="text-[10px] text-slate-600">{(idDocument.size / 1024).toFixed(0)} KB</p>
          </div>
        </div>
      ) : (
        <img src={idDocumentPreview} alt="ID Document" className="w-full h-32 object-cover rounded" />
      )}
      <button
        type="button"
        onClick={() => {
          setIdDocument(null);
          setIdDocumentPreview('');
        }}
        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )}
</div>

{/* Selfie Upload */}
<div>
  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
    Selfie / Profile Photo <span className="text-red-500">*</span>
  </label>
  <p className="text-[10px] text-slate-600 mb-2">
    Clear face photo to match your ID document
  </p>
  {!selfiePreview ? (
    <label className="block w-full border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:border-emerald-500 transition-colors">
      <input
        type="file"
        accept="image/jpeg,image/png,image/jpg"
        capture="user"
        onChange={handleSelfieChange}
        required
        className="hidden"
      />
      <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
      <p className="text-xs text-slate-600 font-semibold">Take or upload selfie</p>
      <p className="text-[10px] text-slate-500 mt-1">JPG or PNG (max 5MB)</p>
    </label>
  ) : (
    <div className="relative border-2 border-emerald-500 rounded-lg p-2">
      <img src={selfiePreview} alt="Selfie" className="w-full h-32 object-cover rounded" />
      <button
        type="button"
        onClick={() => {
          setSelfie(null);
          setSelfiePreview('');
        }}
        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )}
</div>
```

### Same changes needed for DriverSignupForm

The DriverSignupForm also needs the same file upload fields added in the same location (after phone, before email).

## Next Steps:

1. Manually add the file upload fields to the registration page
2. Update the `signUp` function in `lib/auth/actions.ts` to handle file uploads
3. Upload files to Supabase Storage
4. Store URLs in database

## File Upload Flow:

1. User selects file → Preview shown
2. On form submit → Upload to Supabase Storage
3. Get public URL → Store in database
4. Admin reviews documents → Approves/Rejects

