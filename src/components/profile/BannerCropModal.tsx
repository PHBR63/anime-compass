import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Loader2, MoveVertical } from 'lucide-react';

interface BannerCropModalProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
}

/**
 * Modal para ajuste de posicionamento vertical do banner
 * Permite ao usuário escolher qual parte da imagem será exibida
 */
export function BannerCropModal({
  open,
  onClose,
  imageSrc,
  onCropComplete,
}: BannerCropModalProps) {
  const [yPosition, setYPosition] = useState(50); // 0 = topo, 100 = fundo
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Carrega as dimensões naturais da imagem
  useEffect(() => {
    if (imageSrc) {
      const img = new Image();
      img.onload = () => {
        setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = imageSrc;
    }
  }, [imageSrc]);

  // Processa o crop baseado na posição Y escolhida
  const handleConfirm = useCallback(async () => {
    if (!imageNaturalSize.width || !imageNaturalSize.height) return;

    setIsProcessing(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = imageSrc;
      });

      // Dimensões do banner final (proporção 16:6)
      const targetAspect = 16 / 6;
      const sourceAspect = img.naturalWidth / img.naturalHeight;
      
      let cropWidth = img.naturalWidth;
      let cropHeight = img.naturalWidth / targetAspect;
      
      // Se a altura calculada for maior que a imagem, ajusta
      if (cropHeight > img.naturalHeight) {
        cropHeight = img.naturalHeight;
        cropWidth = cropHeight * targetAspect;
      }

      // Calcula a posição Y baseada no slider (0-100)
      const maxY = img.naturalHeight - cropHeight;
      const cropY = (yPosition / 100) * maxY;
      const cropX = (img.naturalWidth - cropWidth) / 2;

      // Cria o canvas e faz o crop
      const canvas = document.createElement('canvas');
      canvas.width = 1200; // Largura final do banner
      canvas.height = 450; // Altura final (1200 / 16 * 6)
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Não foi possível criar contexto do canvas');

      ctx.drawImage(
        img,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, canvas.width, canvas.height
      );

      // Converte para blob
      canvas.toBlob((blob) => {
        if (blob) {
          onCropComplete(blob);
          onClose();
        }
      }, 'image/jpeg', 0.9);

    } catch (error) {
      console.error('Erro ao processar banner:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [imageSrc, yPosition, imageNaturalSize, onCropComplete, onClose]);

  // Limpa estados ao fechar
  const handleClose = useCallback(() => {
    setYPosition(50);
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Posicionar banner do perfil</DialogTitle>
        </DialogHeader>

        {/* Preview do banner com posição ajustável */}
        <div className="relative w-full h-40 bg-muted rounded-lg overflow-hidden">
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Preview do banner"
            className="absolute w-full h-auto min-h-full object-cover"
            style={{
              objectPosition: `center ${yPosition}%`,
            }}
          />
          {/* Overlay indicando área visível */}
          <div className="absolute inset-0 border-2 border-primary/50 rounded-lg pointer-events-none" />
        </div>

        {/* Controle de posicionamento vertical */}
        <div className="flex items-center gap-3 px-2">
          <MoveVertical className="h-4 w-4 text-muted-foreground" />
          <Slider
            value={[yPosition]}
            min={0}
            max={100}
            step={1}
            onValueChange={(value) => setYPosition(value[0])}
            className="flex-1"
          />
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Ajuste o slider para escolher qual parte da imagem será exibida no banner
        </p>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              'Confirmar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
