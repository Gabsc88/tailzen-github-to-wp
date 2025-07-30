import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Github, Download, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import tailzenLogo from "@/assets/tailzen-logo.png";
import JSZip from 'jszip';

interface ConversionResult {
  success: boolean;
  downloadUrl?: string;
  themeName?: string;
  error?: string;
}

const TailZenHero = () => {
  const [githubUrl, setGithubUrl] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const { toast } = useToast();

  const validateGithubUrl = (url: string): boolean => {
    const githubPattern = /^https:\/\/github\.com\/[^\/]+\/[^\/]+\/?$/;
    return githubPattern.test(url.trim());
  };

  const extractRepoInfo = (url: string) => {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace('.git', '')
      };
    }
    return null;
  };

  const simulateConversion = async (repoInfo: { owner: string; repo: string }): Promise<ConversionResult> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
    
    // Simulate success/failure (90% success rate)
    const success = Math.random() > 0.1;
    
    if (success) {
      return {
        success: true,
        downloadUrl: `/themes/${repoInfo.owner}-${repoInfo.repo}-wp-theme.zip`,
        themeName: `${repoInfo.repo.charAt(0).toUpperCase() + repoInfo.repo.slice(1)} WP Theme`
      };
    } else {
      return {
        success: false,
        error: "Unable to convert this repository. Please ensure it contains valid web assets."
      };
    }
  };

  const handleConvert = async () => {
    if (!githubUrl.trim()) {
      toast({
        title: "Please enter a GitHub URL",
        description: "Enter a valid GitHub repository URL to convert it to a WordPress theme.",
        variant: "destructive"
      });
      return;
    }

    if (!validateGithubUrl(githubUrl)) {
      toast({
        title: "Invalid GitHub URL",
        description: "Please enter a valid GitHub repository URL (e.g., https://github.com/user/repo).",
        variant: "destructive"
      });
      return;
    }

    const repoInfo = extractRepoInfo(githubUrl);
    if (!repoInfo) {
      toast({
        title: "Invalid repository format",
        description: "Could not parse repository information from the URL.",
        variant: "destructive"
      });
      return;
    }

    setIsConverting(true);
    setConversionResult(null);
    
    try {
      const result = await simulateConversion(repoInfo);
      setConversionResult(result);
      
      if (result.success) {
        toast({
          title: "Conversion Successful!",
          description: `${result.themeName} is ready for download.`,
        });
      } else {
        toast({
          title: "Conversion Failed",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Conversion Error",
        description: "An unexpected error occurred during conversion.",
        variant: "destructive"
      });
      setConversionResult({
        success: false,
        error: "An unexpected error occurred during conversion."
      });
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = async () => {
    if (conversionResult?.downloadUrl && conversionResult?.themeName) {
      toast({
        title: "Download Started",
        description: "Your WordPress theme is being downloaded.",
      });
      
      try {
        // Create a proper zip file with WordPress theme structure
        const zip = new JSZip();
        const repoInfo = extractRepoInfo(githubUrl);
        const themeName = repoInfo?.repo || 'theme';
        
        // Add WordPress theme files
        zip.file('style.css', `/*
Theme Name: ${conversionResult.themeName}
Description: WordPress theme converted from GitHub repository
Version: 1.0.0
Author: TailZen
*/

/* Your converted styles will be here */
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 0;
}
`);

        zip.file('index.php', `<?php
/**
 * ${conversionResult.themeName}
 * Converted by TailZen
 */

get_header(); ?>

<main id="main" class="site-main">
    <?php if (have_posts()) : ?>
        <?php while (have_posts()) : the_post(); ?>
            <article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
                <h1><?php the_title(); ?></h1>
                <div class="entry-content">
                    <?php the_content(); ?>
                </div>
            </article>
        <?php endwhile; ?>
    <?php endif; ?>
</main>

<?php get_footer(); ?>`);

        zip.file('functions.php', `<?php
/**
 * ${conversionResult.themeName} functions
 */

// Theme setup
function ${themeName}_setup() {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', array('search-form', 'comment-form', 'comment-list', 'gallery', 'caption'));
}
add_action('after_setup_theme', '${themeName}_setup');

// Enqueue styles
function ${themeName}_styles() {
    wp_enqueue_style('${themeName}-style', get_stylesheet_uri());
}
add_action('wp_enqueue_scripts', '${themeName}_styles');
?>`);

        zip.file('header.php', `<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<header id="masthead" class="site-header">
    <div class="site-branding">
        <h1 class="site-title"><a href="<?php echo esc_url(home_url('/')); ?>"><?php bloginfo('name'); ?></a></h1>
        <p class="site-description"><?php bloginfo('description'); ?></p>
    </div>
</header>`);

        zip.file('footer.php', `    <footer id="colophon" class="site-footer">
        <div class="site-info">
            <p>&copy; <?php echo date('Y'); ?> <?php bloginfo('name'); ?>. All rights reserved.</p>
            <p>Theme converted by TailZen</p>
        </div>
    </footer>
    <?php wp_footer(); ?>
</body>
</html>`);

        // Generate zip file
        const content = await zip.generateAsync({ type: 'blob' });
        
        // Create download link
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${themeName}-wp-theme.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Download Complete",
          description: "WordPress theme downloaded successfully!",
        });
      } catch (error) {
        toast({
          title: "Download Error",
          description: "Failed to generate theme file.",
          variant: "destructive"
        });
      }
    }
  };

  const resetForm = () => {
    setGithubUrl('');
    setConversionResult(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 font-sans">
      <div className="w-full max-w-2xl mx-auto text-center">
        {/* Logo and Title */}
        <div className="mb-8">
          <img 
            src={tailzenLogo} 
            alt="TailZen Logo" 
            className="w-20 h-20 mx-auto mb-6 shadow-soft rounded-full"
          />
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 font-sans">
            Tail<span className="bg-hero-gradient bg-clip-text text-transparent">Zen</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto font-medium">
            Convert any GitHub repository into a ready-to-install WordPress theme.
          </p>
        </div>

        {/* Conversion Form */}
        <div className="bg-card rounded-2xl shadow-soft p-8 md:p-10 border border-border">
          {!conversionResult ? (
            <div className="space-y-6">
              <div className="relative">
                <Github className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  type="url"
                  placeholder="https://github.com/user/project-repo"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className="pl-12 h-14 text-lg border-border focus:border-primary focus:ring-primary font-medium"
                  disabled={isConverting}
                />
              </div>
              
              <Button
                onClick={handleConvert}
                variant="hero"
                size="lg"
                className="w-full h-14 text-lg font-semibold"
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
          ) : (
            <div className="space-y-6">
              {conversionResult.success ? (
                <div className="text-center space-y-4">
                  <CheckCircle className="w-16 h-16 text-primary mx-auto" />
                  <h3 className="text-2xl font-bold text-foreground">
                    Conversion Successful!
                  </h3>
                  <p className="text-muted-foreground font-medium">
                    {conversionResult.themeName} is ready for download
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleDownload}
                      variant="hero"
                      size="lg"
                      className="flex-1 font-semibold"
                    >
                      <Download className="w-5 h-5" />
                      Download Theme
                    </Button>
                    <Button
                      onClick={resetForm}
                      variant="outline"
                      size="lg"
                      className="font-medium"
                    >
                      Convert Another
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
                  <h3 className="text-2xl font-bold text-foreground">
                    Conversion Failed
                  </h3>
                  <p className="text-muted-foreground font-medium">
                    {conversionResult.error}
                  </p>
                  <Button
                    onClick={resetForm}
                    variant="hero"
                    size="lg"
                    className="w-full font-semibold"
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground font-medium">
          <p>© 2025 TailZen. All rights reserved.</p>
          <p className="mt-1">Making WordPress theme creation feel like magic.</p>
        </div>
      </div>
    </div>
  );
};

export default TailZenHero;