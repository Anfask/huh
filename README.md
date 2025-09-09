# IQRA School Management Dashboard

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## 🔐 Clerk Dashboard Setup

### Session Claims Configuration

Go to **Clerk Dashboard → Sessions → Claims**, and set:

```json
{
  "publicMetadata": {
    "role": "{{user.public_metadata.role}}"
  }
}
```

This sets the user role (e.g. admin, teacher, etc.) that you can access in your Next.js app via:

```javascript
const role = user?.publicMetadata.role
```

## ☁️ Cloudinary Setup

### Upload Preset Configuration

1. Go to your **Cloudinary Dashboard**
2. Navigate to **Settings → Upload**
3. Scroll down to **Upload presets**
4. Click **Add upload preset**
5. Set the **Preset name** to: `school`
6. Set **Signing Mode** to: `Unsigned`
7. Configure your preset settings as needed (folder, transformations, etc.)
8. Save the preset

**Note:** The preset must be set to **Unsigned** to allow client-side uploads from your Next.js application.

### Usage in Components

The image upload functionality uses Cloudinary's upload widget with the preset:

```jsx
<CldUploadWidget
  uploadPreset="school"
  onSuccess={(result, { widget }) => {
    setImg(result.info);
    widget.close();
  }}
>
  {({ open }) => {
    return (
      <div className="flex items-center gap-2">
        <Image
          src={img?.secure_url || data?.img || "/noAvatar.png"}
          alt=""
          width={28}
          height={28}
          className="w-7 h-7 rounded-full object-cover"
        />
        <div
          className="text-xs text-gray-500 flex items-center gap-2 cursor-pointer"
          onClick={() => open()}
        >
          <Image src="/upload.png" alt="" width={28} height={28} />
          <span>Upload a photo</span>
        </div>
      </div>
    );
  }}
</CldUploadWidget>
```

### Environment Variables

Make sure to add your Cloudinary credentials to your `.env.local` file:

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_SECRET=your_api_secret
```