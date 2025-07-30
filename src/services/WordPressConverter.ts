import { GitHubService } from './GitHubService';

interface ConvertedTheme {
  files: { [filename: string]: string };
  themeName: string;
  description: string;
}

export class WordPressConverter {
  private static extractStylesFromCSS(cssContent: string): string {
    // Remove @import statements that might not work in WordPress
    let processedCSS = cssContent.replace(/@import\s+[^;]+;/g, '');
    
    // Add WordPress-specific styles
    processedCSS += `

/* WordPress-specific styles */
.wp-block-image {
  margin: 1rem 0;
}

.wp-block-group {
  margin: 1rem 0;
}

.entry-content {
  line-height: 1.6;
}

.site-header, .site-footer {
  padding: 1rem 0;
}

/* Responsive WordPress styles */
@media (max-width: 768px) {
  .site-header, .site-footer {
    padding: 0.5rem 0;
  }
}
`;
    
    return processedCSS;
  }

  private static convertHTMLtoPHP(htmlContent: string, fileName: string): string {
    let phpContent = htmlContent;
    
    // Replace common HTML patterns with WordPress equivalents
    phpContent = phpContent.replace(/<title>([^<]*)<\/title>/gi, '<?php wp_title(); ?>');
    
    // Replace meta tags
    phpContent = phpContent.replace(/<meta charset="[^"]*">/gi, '<meta charset="<?php bloginfo(\'charset\'); ?>">');
    
    // Replace basic content areas with WordPress loops
    if (fileName.includes('index') || fileName.includes('home')) {
      phpContent = phpContent.replace(
        /<main[^>]*>[\s\S]*?<\/main>/gi,
        `<main id="main" class="site-main">
    <?php if (have_posts()) : ?>
        <?php while (have_posts()) : the_post(); ?>
            <article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
                <h1><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h1>
                <div class="entry-content">
                    <?php the_excerpt(); ?>
                </div>
                <div class="entry-meta">
                    <span class="posted-on"><?php echo get_the_date(); ?></span>
                    <span class="byline">by <?php the_author(); ?></span>
                </div>
            </article>
        <?php endwhile; ?>
        <?php the_posts_navigation(); ?>
    <?php else : ?>
        <p>No posts found.</p>
    <?php endif; ?>
</main>`
      );
    }
    
    // Add WordPress head and footer calls
    if (phpContent.includes('<head>')) {
      phpContent = phpContent.replace('</head>', '    <?php wp_head(); ?>\n</head>');
    }
    
    if (phpContent.includes('<body')) {
      phpContent = phpContent.replace(/(<body[^>]*>)/, '$1\n<?php wp_body_open(); ?>');
    }
    
    if (phpContent.includes('</body>')) {
      phpContent = phpContent.replace('</body>', '    <?php wp_footer(); ?>\n</body>');
    }
    
    return phpContent;
  }

  private static generateFunctionsPhp(themeName: string, hasCSS: boolean, hasJS: boolean): string {
    const cleanThemeName = themeName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    
    return `<?php
/**
 * ${themeName} Theme Functions
 * Converted by TailZen
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Theme setup
function ${cleanThemeName}_setup() {
    // Add theme support for various features
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', array(
        'search-form',
        'comment-form',
        'comment-list',
        'gallery',
        'caption',
        'style',
        'script'
    ));
    add_theme_support('custom-logo');
    add_theme_support('customize-selective-refresh-widgets');
    
    // Add support for responsive embeds
    add_theme_support('responsive-embeds');
    
    // Add support for editor styles
    add_theme_support('editor-styles');
    
    // Register navigation menus
    register_nav_menus(array(
        'primary' => esc_html__('Primary Menu', '${cleanThemeName}'),
        'footer' => esc_html__('Footer Menu', '${cleanThemeName}'),
    ));
}
add_action('after_setup_theme', '${cleanThemeName}_setup');

// Enqueue styles and scripts
function ${cleanThemeName}_scripts() {
    // Enqueue main stylesheet
    ${hasCSS ? `wp_enqueue_style('${cleanThemeName}-style', get_stylesheet_uri(), array(), '1.0.0');` : ''}
    
    ${hasJS ? `// Enqueue JavaScript
    wp_enqueue_script('${cleanThemeName}-script', get_template_directory_uri() . '/assets/js/main.js', array('jquery'), '1.0.0', true);` : ''}
    
    // Enqueue comment reply script
    if (is_singular() && comments_open() && get_option('thread_comments')) {
        wp_enqueue_script('comment-reply');
    }
}
add_action('wp_enqueue_scripts', '${cleanThemeName}_scripts');

// Custom excerpt length
function ${cleanThemeName}_excerpt_length($length) {
    return 30;
}
add_filter('excerpt_length', '${cleanThemeName}_excerpt_length', 999);

// Custom excerpt more text
function ${cleanThemeName}_excerpt_more($more) {
    return '...';
}
add_filter('excerpt_more', '${cleanThemeName}_excerpt_more');

// Widget areas
function ${cleanThemeName}_widgets_init() {
    register_sidebar(array(
        'name'          => esc_html__('Sidebar', '${cleanThemeName}'),
        'id'            => 'sidebar-1',
        'description'   => esc_html__('Add widgets here.', '${cleanThemeName}'),
        'before_widget' => '<section id="%1$s" class="widget %2$s">',
        'after_widget'  => '</section>',
        'before_title'  => '<h2 class="widget-title">',
        'after_title'   => '</h2>',
    ));
    
    register_sidebar(array(
        'name'          => esc_html__('Footer', '${cleanThemeName}'),
        'id'            => 'footer-1',
        'description'   => esc_html__('Add widgets here.', '${cleanThemeName}'),
        'before_widget' => '<section id="%1$s" class="widget %2$s">',
        'after_widget'  => '</section>',
        'before_title'  => '<h3 class="widget-title">',
        'after_title'   => '</h3>',
    ));
}
add_action('widgets_init', '${cleanThemeName}_widgets_init');
?>`;
  }

  static async convertRepository(owner: string, repo: string): Promise<ConvertedTheme> {
    try {
      // Get repository information
      const repoInfo = await GitHubService.getRepoInfo(owner, repo);
      
      // Get all files from the repository
      const allFiles = await GitHubService.getAllFiles(owner, repo);
      
      // Filter relevant files
      const htmlFiles = allFiles.filter(file => 
        file.name.endsWith('.html') && file.download_url
      );
      
      const cssFiles = allFiles.filter(file => 
        file.name.endsWith('.css') && file.download_url
      );
      
      const jsFiles = allFiles.filter(file => 
        file.name.endsWith('.js') && file.download_url && 
        !file.path.includes('node_modules') && !file.path.includes('.min.')
      );
      
      const imageFiles = allFiles.filter(file =>
        /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(file.name) && file.download_url
      );

      // Start building the theme
      const themeFiles: { [filename: string]: string } = {};
      
      // Generate style.css
      let allStyles = '';
      for (const cssFile of cssFiles.slice(0, 5)) { // Limit to prevent rate limiting
        try {
          const content = await GitHubService.getFileContent(cssFile.download_url!);
          allStyles += `\n/* From ${cssFile.name} */\n${this.extractStylesFromCSS(content)}\n`;
        } catch (error) {
          console.warn(`Failed to fetch CSS file: ${cssFile.name}`);
        }
      }
      
      const themeName = repoInfo.name.charAt(0).toUpperCase() + repoInfo.name.slice(1);
      const styleHeader = `/*
Theme Name: ${themeName}
Description: ${repoInfo.description || 'WordPress theme converted from GitHub repository'}
Version: 1.0.0
Author: TailZen
Text Domain: ${repoInfo.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}
*/

`;
      
      themeFiles['style.css'] = styleHeader + allStyles;
      
      // Process HTML files and convert to PHP
      let hasMainIndex = false;
      for (const htmlFile of htmlFiles.slice(0, 3)) { // Limit processing
        try {
          const content = await GitHubService.getFileContent(htmlFile.download_url!);
          let phpFileName = htmlFile.name.replace('.html', '.php');
          
          // Determine appropriate WordPress template name
          if (htmlFile.name.toLowerCase().includes('index') && !hasMainIndex) {
            phpFileName = 'index.php';
            hasMainIndex = true;
          } else if (htmlFile.name.toLowerCase().includes('header')) {
            phpFileName = 'header.php';
          } else if (htmlFile.name.toLowerCase().includes('footer')) {
            phpFileName = 'footer.php';
          } else if (htmlFile.name.toLowerCase().includes('single')) {
            phpFileName = 'single.php';
          } else if (htmlFile.name.toLowerCase().includes('page')) {
            phpFileName = 'page.php';
          }
          
          themeFiles[phpFileName] = this.convertHTMLtoPHP(content, htmlFile.name);
        } catch (error) {
          console.warn(`Failed to fetch HTML file: ${htmlFile.name}`);
        }
      }
      
      // Ensure we have at least an index.php
      if (!hasMainIndex) {
        themeFiles['index.php'] = `<?php
/**
 * ${themeName} - Main Template
 * Converted by TailZen
 */

get_header(); ?>

<main id="main" class="site-main">
    <?php if (have_posts()) : ?>
        <?php while (have_posts()) : the_post(); ?>
            <article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
                <header class="entry-header">
                    <h1 class="entry-title">
                        <a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
                    </h1>
                    <div class="entry-meta">
                        <span class="posted-on"><?php echo get_the_date(); ?></span>
                        <span class="byline">by <?php the_author(); ?></span>
                    </div>
                </header>
                
                <div class="entry-content">
                    <?php the_excerpt(); ?>
                </div>
                
                <footer class="entry-footer">
                    <a href="<?php the_permalink(); ?>" class="read-more">Read More</a>
                </footer>
            </article>
        <?php endwhile; ?>
        
        <?php the_posts_navigation(); ?>
    <?php else : ?>
        <p><?php esc_html_e('Sorry, no posts matched your criteria.'); ?></p>
    <?php endif; ?>
</main>

<?php get_sidebar(); ?>
<?php get_footer(); ?>`;
      }
      
      // Generate functions.php
      themeFiles['functions.php'] = this.generateFunctionsPhp(
        themeName,
        cssFiles.length > 0,
        jsFiles.length > 0
      );
      
      // Create basic header.php if not exists
      if (!themeFiles['header.php']) {
        themeFiles['header.php'] = `<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="profile" href="https://gmpg.org/xfn/11">
    <?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<div id="page" class="site">
    <header id="masthead" class="site-header">
        <div class="site-branding">
            <?php if (has_custom_logo()) : ?>
                <?php the_custom_logo(); ?>
            <?php else : ?>
                <h1 class="site-title">
                    <a href="<?php echo esc_url(home_url('/')); ?>"><?php bloginfo('name'); ?></a>
                </h1>
                <?php if (get_bloginfo('description')) : ?>
                    <p class="site-description"><?php bloginfo('description'); ?></p>
                <?php endif; ?>
            <?php endif; ?>
        </div>
        
        <nav id="site-navigation" class="main-navigation">
            <?php
            wp_nav_menu(array(
                'theme_location' => 'primary',
                'menu_id'        => 'primary-menu',
                'fallback_cb'    => false,
            ));
            ?>
        </nav>
    </header>`;
      }
      
      // Create basic footer.php if not exists
      if (!themeFiles['footer.php']) {
        themeFiles['footer.php'] = `    <footer id="colophon" class="site-footer">
        <div class="site-info">
            <p>&copy; <?php echo date('Y'); ?> <?php bloginfo('name'); ?>. All rights reserved.</p>
            <p>Theme converted by TailZen from <a href="${repoInfo.html_url}" target="_blank">${repoInfo.name}</a></p>
        </div>
        
        <?php if (is_active_sidebar('footer-1')) : ?>
            <div class="footer-widgets">
                <?php dynamic_sidebar('footer-1'); ?>
            </div>
        <?php endif; ?>
    </footer>
</div><!-- #page -->

<?php wp_footer(); ?>
</body>
</html>`;
      }
      
      // Add README for the theme
      themeFiles['README.md'] = `# ${themeName} WordPress Theme

This theme was automatically converted from the GitHub repository: ${repoInfo.html_url}

## Installation

1. Download the theme zip file
2. Go to WordPress Admin > Appearance > Themes
3. Click "Add New" > "Upload Theme"
4. Upload the zip file and activate

## Features

- Responsive design
- WordPress 6.0+ compatible
- Custom post types support
- Widget areas
- Navigation menus
- Custom logo support

## Original Repository

${repoInfo.description || 'No description available'}

Repository: ${repoInfo.html_url}
Converted by: TailZen

## Support

This is an automatically converted theme. For issues related to the original design, please refer to the source repository.
`;

      return {
        files: themeFiles,
        themeName,
        description: repoInfo.description || 'Converted WordPress theme'
      };
      
    } catch (error) {
      console.error('Conversion error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to convert repository');
    }
  }
}