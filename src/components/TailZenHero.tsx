import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Github } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import tailzenLogo from "@/assets/tailzen-logo.png";

const TailZenHero = () => {
  const [githubUrl, setGithubUrl] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const { toast } = useToast();

  const handleConvert = async () => {
    if (!githubUrl.trim()) {
      toast({
        title: "Please enter a GitHub URL",
        description: "Enter a valid GitHub repository URL to convert it to a WordPress theme.",
        variant: "destructive"
      });
      return;
    }

    if (!githubUrl.includes('github.com')) {
      toast({
        title: "Invalid GitHub URL",
        description: "Please enter a valid GitHub repository URL.",
        variant: "destructive"
      });
      return;
    }

    setIsConverting(true);
    
    // Simulate conversion process
    setTimeout(() => {
      toast({
        title: "Conversion Started!",
        description: "Your GitHub repository is being converted to a WordPress theme. This may take a few minutes.",
      });
      setIsConverting(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-2xl mx-auto text-center">
        {/* Logo and Title */}
        <div className="mb-8">
          <img 
            src={tailzenLogo} 
            alt="TailZen Logo" 
            className="w-20 h-20 mx-auto mb-6 shadow-soft rounded-full"
          />
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Tail<span className="bg-hero-gradient bg-clip-text text-transparent">Zen</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto">
            Convert any GitHub repository into a ready-to-install WordPress theme.
          </p>
        </div>

        {/* Conversion Form */}
        <div className="bg-card rounded-2xl shadow-soft p-8 md:p-10 border border-border">
          <div className="space-y-6">
            <div className="relative">
              <Github className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="url"
                placeholder="https://github.com/user/project-repo"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="pl-12 h-14 text-lg border-border focus:border-primary focus:ring-primary"
                disabled={isConverting}
              />
            </div>
            
            <Button
              onClick={handleConvert}
              variant="hero"
              size="lg"
              className="w-full h-14 text-lg"
              disabled={isConverting}
            >
              {isConverting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Converting...
                </>
              ) : (
                <>
                  Convert to Theme
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>© 2025 TailZen. All rights reserved.</p>
          <p className="mt-1">Making WordPress theme creation feel like magic.</p>
        </div>
      </div>
    </div>
  );
};

export default TailZenHero;