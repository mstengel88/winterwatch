import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText, ExternalLink } from 'lucide-react';

export default function DocsPage() {
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/docs/ios-rebuild-guide.md')
      .then(res => res.text())
      .then(content => {
        setMarkdownContent(content);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load documentation:', err);
        setIsLoading(false);
      });
  }, []);

  const handleDownload = () => {
    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ios-rebuild-guide.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenInNewTab = () => {
    window.open('/docs/ios-rebuild-guide.md', '_blank');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documentation</h1>
          <p className="text-muted-foreground">iOS rebuild guide and reference materials</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleOpenInNewTab}>
            <ExternalLink className="h-4 w-4 mr-2" />
            View Raw
          </Button>
          <Button onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            iOS Rebuild Guide
          </CardTitle>
          <CardDescription>
            Complete guide for rebuilding the WinterWatch Pro iOS application
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap text-xs bg-muted p-4 rounded-lg overflow-auto max-h-[600px]">
                {markdownContent}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <a 
            href="https://capacitorjs.com/docs" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Capacitor Documentation
          </a>
          <a 
            href="https://supabase.com/docs" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Supabase Documentation
          </a>
          <a 
            href="https://docs.lovable.dev" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Lovable Documentation
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
