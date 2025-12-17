import { useState, useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ImageCropModal } from './ImageCropModal';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  displayName: string | null;
  onAvatarUpdated: (newUrl: string) => void;
}

/**
 * Componente para upload e exibição de avatar do usuário
 * Permite fazer upload de imagem para o bucket 'avatars' no Supabase
 * Inclui editor de crop para ajustar a imagem antes do upload
 */
export function AvatarUpload({ userId, currentAvatarUrl, displayName, onAvatarUpdated }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gera as iniciais do nome para o fallback do avatar
  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Manipula o clique no botão de upload
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Processa a seleção do arquivo e abre o modal de crop
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação do tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    // Validação do tamanho (máx 5MB para imagem original antes do crop)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    // Converte o arquivo para data URL e abre o modal de crop
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);

    // Limpa o input para permitir selecionar o mesmo arquivo novamente
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Faz upload da imagem recortada
  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsUploading(true);

    try {
      // Nome único para o arquivo usando timestamp
      const fileName = `${userId}/${Date.now()}.jpg`;

      // Upload para o bucket 'avatars'
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob, { 
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      // Gera URL pública do avatar
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Atualiza o perfil com a nova URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      onAvatarUpdated(publicUrl);
      toast.success('Avatar atualizado!');
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao fazer upload do avatar');
    } finally {
      setIsUploading(false);
      setSelectedImage(null);
    }
  };

  // Fecha o modal de crop
  const handleCropModalClose = () => {
    setCropModalOpen(false);
    setSelectedImage(null);
  };

  return (
    <>
      <div className="relative group">
        <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-primary/20">
          <AvatarImage src={currentAvatarUrl || undefined} alt="Avatar" />
          <AvatarFallback className="bg-gradient-primary text-primary-foreground text-3xl font-bold">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        
        {/* Botão de upload sobreposto ao avatar */}
        <Button 
          variant="glass" 
          size="icon" 
          className="absolute bottom-0 right-0 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleClick}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
        </Button>
        
        {/* Input oculto para seleção de arquivo */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Modal de crop */}
      {selectedImage && (
        <ImageCropModal
          open={cropModalOpen}
          onClose={handleCropModalClose}
          imageSrc={selectedImage}
          onCropComplete={handleCropComplete}
        />
      )}
    </>
  );
}
