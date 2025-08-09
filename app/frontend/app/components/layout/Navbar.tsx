"use client";

import React from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ButtonGroup from "@mui/material/ButtonGroup";
import Button from "@mui/material/Button";

export const Navbar = () => {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{
        width: "100%",
        padding: "10px 20px",
        backgroundColor: "transparent",
        boxShadow: "none",
      }}
    >
      {/* Left Header */}
      <Typography
        variant="h6"
        component="div"
        sx={{ color: "black", fontWeight: "bold" }}
      >
        SafeForms
      </Typography>

      {/* Spacer to push buttons to the center */}
      <Stack sx={{ flexGrow: 1 }} />

      {/* Middle Button Group */}
      <ButtonGroup variant="outlined" aria-label="navigation buttons"    sx={{
          borderColor: "black", // Black outline for the group
        }}>
        <Button
          sx={{
            color: "black",
            borderColor: "black",
            "&:hover": {
              borderColor: "black",
              backgroundColor: "rgba(0, 0, 0, 0.04)", 
            },
          }}
        >
          Home
        </Button>
        <Button
          sx={{
            color: "black", // Text color
            borderColor: "black", // Black outline
            "&:hover": {
              borderColor: "black", // Black outline on hover
              backgroundColor: "rgba(0, 0, 0, 0.04)", // Subtle hover effect
            },
          }}
        >
          About
        </Button>
      </ButtonGroup>

      {/* Spacer to balance the layout */}
      <Stack sx={{ flexGrow: 1 }} />
    </Stack>
  );
};