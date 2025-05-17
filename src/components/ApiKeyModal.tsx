
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { hasApiKey, setApiKey } from '@/utils/textToSpeech';
import { toast } from '@/hooks/use-toast';

interface ApiKeyModalProps {
  onComplete?: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onComplete }) => {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKeyValue] = useState('');

  useEffect(() => {
    // Check if API key is already set
    const hasKey = hasApiKey();
    
    // If no key is set, automatically set the provided key
    if (!hasKey) {
      const elevenLabsApiKey = 'sk_cebaf96eb4f194eccb2555bb521e3fa4bf53e38ea3d8d55c';
      setApiKey(elevenLabsApiKey);
      
      toast({
        title: "Success",
        description: "ElevenLabs API key set automatically. Voice quality has been upgraded!",
        variant: "default"
      });
      
      if (onComplete) {
        onComplete();
      }
    }
    
    setOpen(!hasKey);
  }, [onComplete]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid API key",
        variant: "destructive"
      });
      return;
    }
    
    setApiKey(apiKey.trim());
    setOpen(false);
    
    toast({
      title: "Success",
      description: "ElevenLabs API key set successfully. Voice quality has been upgraded!",
      variant: "default"
    });
    
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enter ElevenLabs API Key</DialogTitle>
          <DialogDescription>
            To enable high-quality AI voice, please enter your ElevenLabs API key.
            You can get one for free at <a href="https://elevenlabs.io/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">elevenlabs.io</a>
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Input
              id="apiKey"
              placeholder="Enter your ElevenLabs API key"
              value={apiKey}
              onChange={(e) => setApiKeyValue(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Your API key is stored locally in your browser and never sent to our servers.
            </p>
          </div>
          
          <DialogFooter className="flex justify-between items-center pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                toast({
                  title: "Using default voice",
                  description: "You can add your API key later in settings.",
                  variant: "default"
                });
                if (onComplete) onComplete();
              }}
            >
              Use Default Voice
            </Button>
            <Button type="submit">
              Save API Key
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ApiKeyModal;
