import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Camera, Loader2, ImageIcon } from 'lucide-react';

interface BannerUploadProps {
  userId: string;
  currentBannerUrl: string | null;
  onBannerUpdated: (url: string) => void;
}

// Componente para upload de banner do perfil
export function BannerUpload({ userId, currentBannerUrl, onBannerUpdated }: BannerUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setIsUploading(true);

    try {
      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/banner-${Date.now()}.${fileExt}`;

      // Upload para o storage
      const { error: uploadError } = await supabase.storage
        .from('avatars') // Usando o mesmo bucket para banners
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Atualizar perfil com a nova URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ banner_url: urlData.publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      onBannerUpdated(urlData.publicUrl);
      toast.success('Banner atualizado!');
    } catch (error) {
      console.error('Error uploading banner:', error);
      toast.error('Erro ao fazer upload do banner');
    } finally {
      setIsUploading(false);
      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="relative w-full h-40 md:h-56 overflow-hidden group">
      {/* Banner Image ou Placeholder com gradiente */}
      {currentBannerUrl ? (
        <img 
          src={currentBannerUrl}
          alt="Banner do perfil"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/10 to-secondary/20 flex items-center justify-center">
          <div className="text-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground/60">Adicione um banner</p>
          </div>
        </div>
      )}

      {/* Gradiente inferior para melhor legibilidade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />

      {/* Overlay com botão de edição */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={handleClick}
          disabled={isUploading}
          className="gap-2 shadow-lg"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Camera className="h-4 w-4" />
              {currentBannerUrl ? 'Alterar Banner' : 'Adicionar Banner'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
