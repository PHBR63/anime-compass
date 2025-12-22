import { useState, useRef } from 'react';
import { Camera, Loader2, ImageOff } from 'lucide-react';
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

// Extensões de arquivo permitidas (mesmas validadas no servidor)
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Valida se o arquivo é uma imagem permitida
 * @param file - Arquivo a ser validado
 * @returns Objeto com resultado da validação e mensagem de erro
 */
function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Validar tipo MIME
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: `Formato não suportado. Use apenas: ${ALLOWED_EXTENSIONS.join(', ').toUpperCase()}` 
    };
  }

  // Validar extensão do arquivo
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
    return { 
      valid: false, 
      error: `Extensão inválida. Use apenas: ${ALLOWED_EXTENSIONS.join(', ')}` 
    };
  }

  // Validar tamanho
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { 
      valid: false, 
      error: `Arquivo muito grande. Máximo permitido: ${MAX_FILE_SIZE_MB}MB` 
    };
  }

  return { valid: true };
}

/**
 * Interpreta erros do Supabase Storage e retorna mensagem amigável
 * @param error - Erro retornado pelo Supabase
 * @returns Mensagem de erro amigável para o usuário
 */
function getUploadErrorMessage(error: Error | { message?: string; statusCode?: string }): string {
  const message = 'message' in error ? error.message?.toLowerCase() : '';
  
  // Erro de política RLS (tipo de arquivo inválido no servidor)
  if (message.includes('policy') || message.includes('violates')) {
    return 'Tipo de arquivo não permitido. Use apenas JPG, PNG ou WebP.';
  }
  
  // Erro de tamanho
  if (message.includes('size') || message.includes('too large')) {
    return `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE_MB}MB`;
  }
  
  // Limite de arquivos atingido
  if (message.includes('limit') || message.includes('count')) {
    return 'Limite de uploads atingido. Delete avatares antigos primeiro.';
  }
  
  // Erro de autenticação
  if (message.includes('auth') || message.includes('unauthorized')) {
    return 'Sessão expirada. Por favor, faça login novamente.';
  }
  
  // Erro de rede
  if (message.includes('network') || message.includes('fetch')) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  }
  
  return 'Erro ao fazer upload. Tente novamente.';
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

    // Validação robusta do arquivo
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error, {
        icon: <ImageOff className="h-4 w-4" />,
        duration: 5000
      });
      // Limpa o input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Converte o arquivo para data URL e abre o modal de crop
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setCropModalOpen(true);
    };
    reader.onerror = () => {
      toast.error('Erro ao ler o arquivo. Tente novamente.');
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

      if (uploadError) {
        const errorMessage = getUploadErrorMessage(uploadError);
        toast.error(errorMessage, {
          icon: <ImageOff className="h-4 w-4" />,
          duration: 5000
        });
        return;
      }

      // Gera URL pública do avatar
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Atualiza o perfil com a nova URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) {
        toast.error('Erro ao atualizar perfil. Tente novamente.');
        return;
      }

      onAvatarUpdated(publicUrl);
      toast.success('Avatar atualizado com sucesso!');
    } catch (error) {
      console.error('Erro no upload:', error);
      const errorMessage = error instanceof Error 
        ? getUploadErrorMessage(error)
        : 'Erro inesperado. Tente novamente.';
      toast.error(errorMessage, {
        icon: <ImageOff className="h-4 w-4" />,
        duration: 5000
      });
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
          accept=".jpg,.jpeg,.png,.webp"
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