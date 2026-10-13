/**
 * Upload a raw SVG string to Cloudinary.
 * The SVG is encoded as a UTF-8 data URI so hex colors and special
 * characters survive the btoa call.
 */
export async function uploadSvgToCloudinary(svgString, publicId) {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !preset) throw new Error('Cloudinary env vars missing.');

    const base64 = btoa(unescape(encodeURIComponent(svgString)));
    const dataUri = `data:image/svg+xml;base64,${base64}`;

    const form = new FormData();
    form.append('file', dataUri);
    form.append('upload_preset', preset);
    form.append('folder', 'barcodes');
    if (publicId) form.append('public_id', publicId);

    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: form }
    );

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Cloudinary upload failed.');
    }

    const data = await res.json();
    return data.secure_url;
}

/**
 * Upload a File/Blob to Cloudinary.
 * `folder` is the Cloudinary folder the file lands in.
 */
export async function uploadFileToCloudinary(file, folder = 'products') {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !preset) throw new Error('Cloudinary env vars missing.');

    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', preset);
    form.append('folder', folder);

    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: form }
    );

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Cloudinary upload failed.');
    }

    const data = await res.json();
    return data.secure_url;
}