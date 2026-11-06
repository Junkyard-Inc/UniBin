import IconButton from '@mui/material/IconButton';
import React from 'react';

interface CustomIconButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string; 
  isActive?: boolean; 
}

export function CustomIconButton({ onClick, icon, label, isActive = false }: CustomIconButtonProps) {
  return (
			<IconButton
				onClick={onClick}
				aria-label={label}
				style={{
          backgroundColor: isActive ? "#2563eb" : "#ffffff",
          color: isActive ? "#ffffff" : "#1f2937",
          boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
          padding: "12px",
          transition: "all 0.2s ease-in-out",
        }}
				sx={{
          "&:hover": {
            backgroundColor: isActive ? "#1d4ed8" : "#f3f4f6",
          },
        }}
			>
				{icon}
			</IconButton>
  );
}

export default CustomIconButton;