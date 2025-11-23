
import React, { useEffect } from 'react';
import { hasApiKey, setApiKey } from '@/utils/textToSpeech';
import { toast } from '@/hooks/use-toast';

const ApiKeyModal: React.FC = () => {
  useEffect(() => {
    if (!hasApiKey()) {
      const elevenLabsApiKey = 'sk_382ca005822432eb0ae9347fa04ea79c341bc24f4d21c418';
      setApiKey(elevenLabsApiKey);
      
      toast({
        title: "Success",
        description: "ElevenLabs API key set automatically. Voice quality has been upgraded!",
        variant: "default"
      });
    }
  }, []);

  return null;
};

export default ApiKeyModal;
