const PUBLIC_KEY = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY as string;

export async function uploadToImageKit(file: File, folder = 'avatars'): Promise<string> {
  if (!PUBLIC_KEY) throw new Error('VITE_IMAGEKIT_PUBLIC_KEY is not set');

  const authRes = await fetch('/api/imagekit-auth');
  if (!authRes.ok) throw new Error('Failed to get ImageKit auth signature');
  const { token, expire, signature } = (await authRes.json()) as {
    token: string;
    expire: number;
    signature: string;
  };

  const form = new FormData();
  form.append('file', file);
  form.append('fileName', file.name);
  form.append('folder', folder);
  form.append('publicKey', PUBLIC_KEY);
  form.append('token', token);
  form.append('expire', String(expire));
  form.append('signature', signature);
  form.append('useUniqueFileName', 'true');

  const uploadRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    body: form,
  });
  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`ImageKit upload failed: ${err}`);
  }
  const data = (await uploadRes.json()) as { url: string };
  return data.url;
}
