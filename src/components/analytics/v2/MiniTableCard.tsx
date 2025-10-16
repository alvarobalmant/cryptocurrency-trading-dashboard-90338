import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

interface MiniTableCardProps {
  title: string;
  columns: string[];
  data: any[][];
  maxRows?: number;
  showMore?: boolean;
  onShowMore?: () => void;
}

export const MiniTableCard = ({
  title,
  columns,
  data,
  maxRows = 5,
  showMore = false,
  onShowMore
}: MiniTableCardProps) => {
  const displayData = data.slice(0, maxRows);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {data.length > maxRows && (
          <CardDescription>
            Mostrando {maxRows} de {data.length} registros
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, index) => (
                <TableHead key={index} className="text-xs font-medium">
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.map((row, rowIndex) => (
              <TableRow key={rowIndex} className="hover:bg-muted/50">
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex} className="text-sm py-2">
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {showMore && data.length > maxRows && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2"
            onClick={onShowMore}
          >
            Ver todos
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
