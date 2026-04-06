// src/constants/fonts.ts

export interface GoogleFont {
  name: string;
  family: string;
  url: string;
}

export const SUPPORTED_GOOGLE_FONTS: GoogleFont[] = [
  { 
    name: 'Inter', 
    family: 'Inter, system-ui, sans-serif', 
    url: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap' 
  },
  { 
    name: 'Roboto', 
    family: 'Roboto, sans-serif', 
    url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap' 
  },
  { 
    name: 'Open Sans', 
    family: 'Open Sans, sans-serif', 
    url: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&display=swap' 
  },
  { 
    name: 'Montserrat', 
    family: 'Montserrat, sans-serif', 
    url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap' 
  },
  { 
    name: 'Poppins', 
    family: 'Poppins, sans-serif', 
    url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap' 
  },
  { 
    name: 'Lato', 
    family: 'Lato, sans-serif', 
    url: 'https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap' 
  },
  { 
    name: 'Nunito', 
    family: 'Nunito, sans-serif', 
    url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&display=swap' 
  },
  { 
    name: 'Ubuntu', 
    family: 'Ubuntu, sans-serif', 
    url: 'https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap' 
  },
  { 
    name: 'Playfair Display', 
    family: 'Playfair Display, serif', 
    url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap' 
  },
  { 
    name: 'Lora', 
    family: 'Lora, serif', 
    url: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap' 
  },
  { 
    name: 'Merriweather', 
    family: 'Merriweather, serif', 
    url: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap' 
  },
  { 
    name: 'Oswald', 
    family: 'Oswald, sans-serif', 
    url: 'https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&display=swap' 
  },
  { 
    name: 'Space Grotesk', 
    family: 'Space Grotesk, sans-serif', 
    url: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap' 
  },
  { 
    name: 'JetBrains Mono', 
    family: 'JetBrains Mono, monospace', 
    url: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap' 
  },
  { 
    name: 'Fira Code', 
    family: 'Fira+Code, monospace', 
    url: 'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&display=swap' 
  },
  { 
    name: 'Source Code Pro', 
    family: 'Source Code Pro, monospace', 
    url: 'https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500;600;700&display=swap' 
  },
  { 
    name: 'Architects Daughter', 
    family: 'Architects Daughter, cursive', 
    url: 'https://fonts.googleapis.com/css2?family=Architects+Daughter&display=swap' 
  },
];

export const FONT_FAMILY_OPTIONS = SUPPORTED_GOOGLE_FONTS.map(f => f.family);

/** Helper to find a Google Font by its family string or name */
export function findGoogleFont(identifier: string): GoogleFont | undefined {
  const lower = identifier.toLowerCase();
  return SUPPORTED_GOOGLE_FONTS.find(f => 
    lower.includes(f.name.toLowerCase()) || lower.includes(f.family.toLowerCase().split(',')[0])
  );
}
