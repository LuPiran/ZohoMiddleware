import {
  MdFolder,
  MdInsertDriveFile,
  MdWaterDrop,
  MdFavoriteBorder,
  MdGpsFixed,
  MdWorkOutline,
  MdScience,
  MdVerified,
  MdMenuBook,
  MdLink,
  MdEvent,
  MdSchool,
  MdChevronRight,
  MdOpenInNew,
} from "react-icons/md";

export const CATALOG_ICONS = {
  droplet: MdWaterDrop,
  heart: MdFavoriteBorder,
  target: MdGpsFixed,
  briefcase: MdWorkOutline,
  micro: MdScience,
  check: MdVerified,
  book: MdMenuBook,
  link: MdLink,
  cal: MdEvent,
  grad: MdSchool,
  file: MdInsertDriveFile,
  folder: MdFolder,
  isolate: MdScience,
};

export const ICON_TONES = {
  droplet: {
    wrap: "bg-[#3da2b8]/12 text-[#2d7a8a]",
    hover: "hover:bg-[#3da2b8]/8",
    border: "border-[1.5px] border-[#2d7a8a]",
  },
  heart: {
    wrap: "bg-tegra-teal/18 text-[#b56b6e]",
    hover: "hover:bg-tegra-teal/10",
    border: "border-[1.5px] border-[#b56b6e]",
  },
  target: {
    wrap: "bg-tegra-teal/22 text-[#9d4d55]",
    hover: "hover:bg-tegra-teal/12",
    border: "border-[1.5px] border-[#9d4d55]",
  },
  briefcase: {
    wrap: "bg-tegra-blue-light/15 text-tegra-blue-light",
    hover: "hover:bg-tegra-blue-light/8",
    border: "border-[1.5px] border-tegra-blue-light",
  },
  micro: {
    wrap: "bg-tegra-blue-dark/8 text-tegra-blue-dark",
    hover: "hover:bg-tegra-blue-dark/5",
    border: "border-[1.5px] border-tegra-blue-dark",
  },
  check: {
    wrap: "bg-tegra-success-light text-tegra-success",
    hover: "hover:bg-emerald-50",
    border: "border-[1.5px] border-tegra-success",
  },
  book: {
    wrap: "bg-amber-100 text-amber-800",
    hover: "hover:bg-amber-50",
    border: "border-[1.5px] border-amber-700",
  },
  link: {
    wrap: "bg-[#3da2b8]/12 text-[#2d7a8a]",
    hover: "hover:bg-[#3da2b8]/8",
    border: "border-[1.5px] border-[#2d7a8a]",
  },
  cal: {
    wrap: "bg-tegra-blue-light/15 text-tegra-blue-light",
    hover: "hover:bg-tegra-blue-light/8",
    border: "border-[1.5px] border-tegra-blue-light",
  },
  grad: {
    wrap: "bg-tegra-teal/18 text-[#b56b6e]",
    hover: "hover:bg-tegra-teal/10",
    border: "border-[1.5px] border-[#b56b6e]",
  },
  file: {
    wrap: "bg-[#3da2b8]/12 text-[#2d7a8a]",
    hover: "hover:bg-[#3da2b8]/8",
    border: "border-[1.5px] border-[#2d7a8a]",
  },
  folder: {
    wrap: "bg-tegra-blue-dark/8 text-tegra-blue-dark",
    hover: "hover:bg-tegra-blue-dark/5",
    border: "border-[1.5px] border-tegra-blue-dark",
  },
  isolate: {
    wrap: "bg-violet-100 text-violet-700",
    hover: "hover:bg-violet-50",
    border: "border-[1.5px] border-violet-700",
  },
};

export const TAG_STYLES = {
  "Full Spectrum": "bg-[#3da2b8]/15 text-[#2d7a8a]",
  "Broad Spectrum": "bg-tegra-blue-dark/10 text-tegra-blue-dark",
  Isolate: "bg-violet-100 text-violet-700",
};

export function getCatalogIcon(name) {
  return CATALOG_ICONS[name] || MdInsertDriveFile;
}

export function getIconTone(name) {
  return ICON_TONES[name] || ICON_TONES.folder;
}

export { MdChevronRight, MdOpenInNew };
