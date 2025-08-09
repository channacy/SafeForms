"use client";

import React from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ButtonGroup from "@mui/material/ButtonGroup";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

export const Navbar = () => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleAvatarClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Stack
      direction="row"
      alignItems="center"
      sx={{
        width: "100%",
        padding: "10px 20px",
        backgroundColor: "transparent",
        boxShadow: "none",
        position: "relative",
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

      {/* Middle Button Group (Centered) */}
      <Stack
        sx={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <ButtonGroup
          variant="outlined"
          aria-label="navigation buttons"
          sx={{
            borderColor: "black",
          }}
        >
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
            AI Auto-Fill Answers
          </Button>
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
            Generate Vendor Questionnaire
          </Button>
        </ButtonGroup>
      </Stack>

      {/* Avatar with Dropdown */}
      <Avatar
        alt="Profile Picture"
        src="https://images.unsplash.com/photo-1752118464988-2914fb27d0f0?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTh8fHByb2Zlc3Npb25hbCUyMHBmcHxlbnwwfHwwfHx8MA%3D%3D"
        sx={{
          width: 40,
          height: 40,
          marginLeft: "auto",
          cursor: "pointer",
        }}
        onClick={handleAvatarClick}
      />
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <MenuItem>My Documents</MenuItem>
      </Menu>
    </Stack>
  );
};
