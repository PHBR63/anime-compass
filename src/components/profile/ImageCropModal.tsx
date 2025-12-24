import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Loader2, ZoomIn, RotateCcw } from 'lucide-react';
import { getCroppedImg, PixelCrop } from '@/lib/cropImage';

interface ImageCropModalProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
}

/**
 * Modal para recorte de imagens com preview circular
 * Permite ao usuário ajustar zoom e posição antes de confirmar
 */
export function ImageCropModal({
  open,
  onClose,
  imageSrc,
  onCropComplete,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Callback quando o usuário move/zooma a imagem
  const onCropChange = useCallback((crop: Point) => {
    setCrop(crop);
  }, []);

  // Callback quando o zoom muda
  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  // Callback quando a área de crop é definida
  const onCropAreaComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Reseta o zoom e posição
  const handleReset = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  // Processa o crop e retorna a imagem recortada
  const handleConfirm = useCallback(async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedBlob);
      onClose();
    } catch (error) {
      console.error('Erro ao recortar imagem:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [imageSrc, croppedAreaPixels, onCropComplete, onClose]);

  // Limpa estados ao fechar
  const handleClose = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {/* Modal responsiva com largura adaptável */}
      <DialogContent className="w-[95vw] max-w-md flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-4 flex-shrink-0">
          <DialogTitle>Ajustar foto de perfil</DialogTitle>
        </DialogHeader>

        <div className="px-4 sm:px-6 space-y-4 pb-4">
          {/* Área de crop */}
          <div className="relative w-full h-56 sm:h-64 bg-muted rounded-lg overflow-hidden">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={onCropAreaComplete}
            />
          </div>

          {/* Controle de zoom */}
          <div className="flex items-center gap-3 px-2">
            <ZoomIn className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={(value) => setZoom(value[0])}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReset}
              className="h-8 w-8 flex-shrink-0"
              title="Resetar"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Arraste para posicionar e use o zoom para ajustar
          </p>
        </div>

        {/* Footer fixo com botões */}
        <div className="flex justify-end gap-2 p-4 sm:p-6 pt-4 border-t flex-shrink-0">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
