import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExistingProfile } from '@/hooks/useNativeClientAuth';

interface ExistingProfileDialogProps {
  open: boolean;
  onClose: () => void;
  existingProfiles: ExistingProfile[];
  barbershopName: string;
  onUseExisting: (sourceBarbershopId: string, clientName: string) => void;
  onCreateNew: (customName: string) => void;
}

export const ExistingProfileDialog = ({
  open,
  onClose,
  existingProfiles,
  barbershopName,
  onUseExisting,
  onCreateNew
}: ExistingProfileDialogProps) => {
  const [selectedProfile, setSelectedProfile] = useState<ExistingProfile | null>(null);
  const [customName, setCustomName] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);

  const handleUseExisting = () => {
    if (selectedProfile) {
      onUseExisting(selectedProfile.barbershop_id, selectedProfile.client_name);
    }
  };

  const handleCreateNew = () => {
    if (customName.trim()) {
      onCreateNew(customName.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dados encontrados!</DialogTitle>
          <DialogDescription>
            Vimos que você já tem cadastro na nossa plataforma em outras barbearias.
            Como gostaria de prosseguir?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lista de perfis existentes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Reutilizar dados de:</Label>
            {existingProfiles.map((profile) => (
              <div
                key={profile.barbershop_id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedProfile?.barbershop_id === profile.barbershop_id
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-primary/50'
                }`}
                onClick={() => setSelectedProfile(profile)}
              >
                <div className="font-medium">{profile.client_name}</div>
                <div className="text-sm text-muted-foreground">{profile.barbershop_name}</div>
              </div>
            ))}
          </div>

          {selectedProfile && (
            <Button onClick={handleUseExisting} className="w-full">
              Usar dados de "{selectedProfile.client_name}"
            </Button>
          )}

          <div className="text-center text-sm text-muted-foreground">OU</div>

          {/* Opção de criar novo */}
          {!showNewForm ? (
            <Button
              variant="outline"
              onClick={() => setShowNewForm(true)}
              className="w-full"
            >
              Criar novo perfil para {barbershopName}
            </Button>
          ) : (
            <div className="space-y-3">
              <Label htmlFor="customName">Nome para {barbershopName}:</Label>
              <Input
                id="customName"
                placeholder="Digite seu nome"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowNewForm(false)}
                  className="flex-1"
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleCreateNew}
                  disabled={!customName.trim()}
                  className="flex-1"
                >
                  Criar perfil
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};