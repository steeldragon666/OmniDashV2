import { Request, Response } from 'express';
import { BrandIcons, IconUtils, BrandColors, BrandGradients } from '@/assets/icons';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export class AssetsController {
  // Get all available icons
  async getIcons(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { category, format = 'svg' } = req.query;

      let icons = {};

      if (category) {
        const iconsByCategory = IconUtils.getIconsByCategory();
        const categoryIcons = iconsByCategory[category as keyof typeof iconsByCategory];
        
        if (categoryIcons) {
          icons = categoryIcons.reduce((acc, iconName) => {
            acc[iconName] = format === 'dataurl' 
              ? IconUtils.toDataUrl(iconName as keyof typeof BrandIcons)
              : BrandIcons[iconName as keyof typeof BrandIcons];
            return acc;
          }, {} as Record<string, string>);
        }
      } else {
        // Return all icons
        icons = Object.keys(BrandIcons).reduce((acc, iconName) => {
          acc[iconName] = format === 'dataurl'
            ? IconUtils.toDataUrl(iconName as keyof typeof BrandIcons)
            : BrandIcons[iconName as keyof typeof BrandIcons];
          return acc;
        }, {} as Record<string, string>);
      }

      res.json({
        success: true,
        icons,
        categories: IconUtils.getIconsByCategory(),
        totalIcons: Object.keys(BrandIcons).length
      });
    } catch (error) {
      console.error('Get icons error:', error);
      res.status(500).json({
        error: 'Failed to fetch icons'
      });
    }
  }

  // Get a specific icon
  async getIcon(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { iconName } = req.params;
      const { size, color, format = 'svg' } = req.query;

      if (!(iconName in BrandIcons)) {
        res.status(404).json({
          error: 'Icon not found',
          availableIcons: Object.keys(BrandIcons)
        });
        return;
      }

      let icon;
      if (format === 'dataurl') {
        icon = IconUtils.toDataUrl(iconName as keyof typeof BrandIcons);
      } else {
        icon = IconUtils.getIcon(iconName as keyof typeof BrandIcons, {
          size: size ? parseInt(size as string) : undefined,
          color: color as string
        });
      }

      if (format === 'svg') {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(icon);
      } else {
        res.json({
          success: true,
          icon,
          name: iconName,
          format
        });
      }
    } catch (error) {
      console.error('Get icon error:', error);
      res.status(500).json({
        error: 'Failed to fetch icon'
      });
    }
  }

  // Get brand colors
  async getColors(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        colors: BrandColors,
        gradients: BrandGradients
      });
    } catch (error) {
      console.error('Get colors error:', error);
      res.status(500).json({
        error: 'Failed to fetch colors'
      });
    }
  }

  // Get brand assets manifest
  async getManifest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const manifest = {
        name: 'OmniDash',
        shortName: 'OmniDash',
        description: 'Multi-Brand Social Media Management Platform',
        version: '1.0.0',
        
        // Brand identity
        brand: {
          colors: BrandColors,
          gradients: BrandGradients,
          fonts: {
            primary: 'Inter, system-ui, sans-serif',
            secondary: 'JetBrains Mono, monospace'
          }
        },

        // Icon categories
        icons: {
          categories: IconUtils.getIconsByCategory(),
          total: Object.keys(BrandIcons).length
        },

        // Design system
        designSystem: {
          borderRadius: {
            sm: '4px',
            md: '8px',
            lg: '12px',
            xl: '16px',
            full: '9999px'
          },
          spacing: {
            xs: '4px',
            sm: '8px',
            md: '16px',
            lg: '24px',
            xl: '32px',
            '2xl': '48px',
            '3xl': '64px'
          },
          shadows: {
            sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          },
          typography: {
            sizes: {
              xs: '12px',
              sm: '14px',
              base: '16px',
              lg: '18px',
              xl: '20px',
              '2xl': '24px',
              '3xl': '30px',
              '4xl': '36px'
            },
            weights: {
              light: '300',
              normal: '400',
              medium: '500',
              semibold: '600',
              bold: '700'
            }
          }
        },

        // Platform-specific assets
        platforms: {
          web: {
            favicon: '/assets/favicon.ico',
            appleTouchIcon: '/assets/apple-touch-icon.png',
            manifest: '/assets/manifest.json'
          },
          social: {
            ogImage: '/assets/og-image.png',
            twitterCard: '/assets/twitter-card.png'
          }
        }
      };

      res.json({
        success: true,
        manifest
      });
    } catch (error) {
      console.error('Get manifest error:', error);
      res.status(500).json({
        error: 'Failed to fetch brand manifest'
      });
    }
  }

  // Generate platform-specific icons
  async generatePlatformIcons(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { platform, sizes } = req.body;

      const supportedPlatforms = ['web', 'ios', 'android', 'pwa'];
      const defaultSizes = {
        web: [16, 32, 48, 64, 128],
        ios: [29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180],
        android: [36, 48, 72, 96, 144, 192],
        pwa: [72, 96, 128, 144, 152, 192, 384, 512]
      };

      if (!supportedPlatforms.includes(platform)) {
        res.status(400).json({
          error: 'Unsupported platform',
          supportedPlatforms
        });
        return;
      }

      const iconSizes = sizes || defaultSizes[platform as keyof typeof defaultSizes];
      const baseIcon = BrandIcons.omnidash;

      const generatedIcons = iconSizes.map((size: number) => ({
        size,
        src: IconUtils.toDataUrl('omnidash'),
        type: 'image/svg+xml',
        purpose: platform === 'pwa' ? 'any maskable' : 'any'
      }));

      res.json({
        success: true,
        platform,
        icons: generatedIcons,
        metadata: {
          total: generatedIcons.length,
          formats: ['svg'],
          baseIcon: 'omnidash'
        }
      });
    } catch (error) {
      console.error('Generate platform icons error:', error);
      res.status(500).json({
        error: 'Failed to generate platform icons'
      });
    }
  }

  // Get social media profile assets
  async getSocialAssets(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { platform } = req.params;

      const socialAssets = {
        twitter: {
          profileImage: {
            size: '400x400px',
            format: 'PNG/JPG',
            icon: IconUtils.toDataUrl('omnidash'),
            background: BrandColors.primary
          },
          bannerImage: {
            size: '1500x500px',
            format: 'PNG/JPG',
            gradient: BrandGradients.primary
          }
        },
        instagram: {
          profileImage: {
            size: '320x320px',
            format: 'PNG/JPG',
            icon: IconUtils.toDataUrl('omnidash'),
            background: BrandColors.primary
          },
          storyHighlight: {
            size: '161x161px',
            format: 'PNG/JPG'
          }
        },
        linkedin: {
          profileImage: {
            size: '400x400px',
            format: 'PNG/JPG',
            icon: IconUtils.toDataUrl('omnidash'),
            background: BrandColors.primary
          },
          companyLogo: {
            size: '300x300px',
            format: 'PNG/JPG (white background)'
          },
          bannerImage: {
            size: '1584x396px',
            format: 'PNG/JPG'
          }
        },
        facebook: {
          profileImage: {
            size: '180x180px',
            format: 'PNG/JPG',
            icon: IconUtils.toDataUrl('omnidash'),
            background: BrandColors.primary
          },
          coverPhoto: {
            size: '851x315px',
            format: 'PNG/JPG'
          }
        },
        tiktok: {
          profileImage: {
            size: '200x200px',
            format: 'PNG/JPG',
            icon: IconUtils.toDataUrl('omnidash'),
            background: BrandColors.primary
          }
        },
        youtube: {
          profileImage: {
            size: '800x800px',
            format: 'PNG/JPG',
            icon: IconUtils.toDataUrl('omnidash'),
            background: BrandColors.primary
          },
          channelArt: {
            size: '2560x1440px',
            format: 'PNG/JPG'
          }
        }
      };

      if (platform && platform !== 'all') {
        if (!(platform in socialAssets)) {
          res.status(404).json({
            error: 'Platform not found',
            availablePlatforms: Object.keys(socialAssets)
          });
          return;
        }

        res.json({
          success: true,
          platform,
          assets: socialAssets[platform as keyof typeof socialAssets]
        });
      } else {
        res.json({
          success: true,
          platforms: socialAssets
        });
      }
    } catch (error) {
      console.error('Get social assets error:', error);
      res.status(500).json({
        error: 'Failed to fetch social assets'
      });
    }
  }

  // Generate brand kit
  async generateBrandKit(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { includeIcons = true, includeColors = true, includeLogos = true } = req.body;

      const brandKit: any = {
        metadata: {
          name: 'OmniDash Brand Kit',
          version: '1.0.0',
          generatedAt: new Date().toISOString(),
          description: 'Complete brand asset collection for OmniDash'
        }
      };

      if (includeLogos) {
        brandKit.logos = {
          primary: IconUtils.toDataUrl('omnidash'),
          variations: [
            { name: 'primary', icon: IconUtils.toDataUrl('omnidash') },
            { name: 'light', icon: IconUtils.getIcon('omnidash', { color: BrandColors.white }) },
            { name: 'dark', icon: IconUtils.getIcon('omnidash', { color: BrandColors.gray900 }) }
          ]
        };
      }

      if (includeColors) {
        brandKit.colors = BrandColors;
        brandKit.gradients = BrandGradients;
      }

      if (includeIcons) {
        brandKit.icons = {
          categories: IconUtils.getIconsByCategory(),
          assets: BrandIcons
        };
      }

      brandKit.guidelines = {
        logoUsage: [
          'Maintain minimum clear space equal to the height of the logo',
          'Do not alter the logo proportions or colors',
          'Use high contrast backgrounds for optimal visibility',
          'Minimum size: 24px for digital, 0.5 inch for print'
        ],
        colorUsage: [
          'Primary color should be used for main brand elements',
          'Secondary color for accents and highlights',
          'Ensure WCAG AA compliance for text contrast ratios',
          'Use gradients sparingly for premium feel'
        ],
        typography: [
          'Primary font: Inter (headings, UI elements)',
          'Secondary font: JetBrains Mono (code, technical content)',
          'Maintain consistent line heights and spacing',
          'Use font weights meaningfully: 400 (normal), 500 (medium), 600 (semibold)'
        ]
      };

      res.json({
        success: true,
        brandKit
      });
    } catch (error) {
      console.error('Generate brand kit error:', error);
      res.status(500).json({
        error: 'Failed to generate brand kit'
      });
    }
  }
}