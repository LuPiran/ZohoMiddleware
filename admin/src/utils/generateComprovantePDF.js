import jsPDF from 'jspdf';

// Logo da TegraCorp em base64
const LOGO_TEGRA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA8AAAACAYAAAD4xJHFAAAACXBIWXMAAA7DAAAOwwHHb6thAAAgAElEQVR4nO3dd3gc1bkG8BfVN1apIMskG4ppsXGHtNPbbgqEkIQWIAFSIIRcLpTkhrRLArk3hZJLIKRcSLmGAIQWQgoQWugdgwHTwRgbg7HBVLCNZVsqVll7949vZ7VaiLRSd2d29vl9n0+MvbuzM2f2zO7O973v+3mSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSjigGCggGCAYIBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYIBggGCAYAA/f/zzf/7pn/85p9N2v+RyuQaLxfz/8XgUTqdzMpnM/Pz8/kHKZDJ/+tOf/vKXv/z1r3/967/+61/+8pe//PVvf/vbX//+97/+9a9/+VvW+a1v+D6G72P4PoHvk/k+hu9tGL6PoXvj+xl6N45vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47vN47=';

/**
 * Gera um PDF de comprovante com as informações da solicitação
 * @param {Object} dados - Dados da solicitação
 */
export const gerarComprovantePDF = (dados) => {
  const doc = new jsPDF('p', 'mm', 'a4');

  // Cores da marca - Paleta profissional
  const corPrincipal = [25, 118, 210];      // Azul vibrante
  const corSecundaria = [66, 133, 244];     // Azul claro
  const corLinha = [230, 230, 230];         // Cinza muito claro
  const corTexto = [33, 33, 33];            // Cinza escuro
  const corTextoClaro = [102, 102, 102];    // Cinza médio
  const corBranco = [255, 255, 255];        // Branco

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margemEsquerda = 15;
  const margemDireita = 15;
  const larguraPagina = pageWidth - margemDireita - margemEsquerda;

  let yPosition = 0;

  // ========== CABEÇALHO PRINCIPAL ==========
  // Fundo gradiente simulado com retângulo azul forte
  doc.setFillColor(...corPrincipal);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Logo da TegraCorp
  try {
    doc.addImage(LOGO_TEGRA, 'PNG', margemEsquerda, 5, 25, 25);
  } catch (e) {
    // Se a imagem não carregar, usar texto como fallback
    doc.setTextColor(...corBranco);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('Tegra', margemEsquerda, 20);
  }

  // Texto branco no cabeçalho
  doc.setTextColor(...corBranco);
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text('Comprovante de Solicitação', margemEsquerda + 30, 20);

  // Protocolo em destaque no cabeçalho
  const numeroProtocolo = dados.protocolo || 'N/A';
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text(`Protocolo: ${numeroProtocolo}`, pageWidth - margemDireita - 50, 30);

  yPosition = 58;

  // ========== INFORMAÇÕES GERAIS ==========
  doc.setTextColor(...corTexto);
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');

  const dataFormatada = formatarDataComHora(dados.dataCriacao);
  doc.text(`Inserido no dia: ${dataFormatada}`, margemEsquerda, yPosition);
  yPosition += 8;

  // Linha divisória
  doc.setDrawColor(...corLinha);
  doc.setLineWidth(0.5);
  doc.line(margemEsquerda, yPosition, pageWidth - margemDireita, yPosition);
  yPosition += 8;

  // ========== TIPO DE SOLICITAÇÃO E CONSULTOR ==========
  doc.setTextColor(...corTexto);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('INFORMAÇÕES GERAIS', margemEsquerda, yPosition);
  yPosition += 7;

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');

  const infoGeral = [
    { label: 'Tipo de solicitação:', valor: dados.tipoSolicitacao || 'N/A' },
    { label: 'Consultor Tegra:', valor: dados.consultorTegra || 'N/A' },
  ];

  for (const info of infoGeral) {
    doc.setFont(undefined, 'bold');
    doc.text(info.label, margemEsquerda, yPosition);
    doc.setFont(undefined, 'normal');
    doc.text(info.valor, margemEsquerda + 50, yPosition);
    yPosition += 5;
  }

  yPosition += 3;

  // ========== DADOS DO PACIENTE ==========
  doc.setTextColor(...corTexto);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('DADOS DO PACIENTE', margemEsquerda, yPosition);
  yPosition += 7;

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');

  const dadosPaciente = [
    { label: 'Primeiro Nome:', valor: dados.nomePaciente || 'N/A' },
    { label: 'Sobrenome:', valor: dados.sobrenomePaciente || 'N/A' },
    { label: 'Data de nascimento:', valor: formatarDataBR(dados.dataNascimento) },
    { label: 'CPF:', valor: formatarCPF(dados.cpfPaciente) },
    { label: 'RG:', valor: dados.rgPaciente || 'N/A' },
    { label: 'E-mail:', valor: dados.emailPaciente || 'N/A' },
    { label: 'Celular:', valor: formatarTelefone(dados.celularPaciente) },
    { label: 'Telefone:', valor: formatarTelefone(dados.telefonePaciente) },
  ];

  for (const dado of dadosPaciente) {
    doc.setFont(undefined, 'bold');
    doc.text(dado.label, margemEsquerda, yPosition);
    doc.setFont(undefined, 'normal');
    doc.text(dado.valor, margemEsquerda + 50, yPosition);
    yPosition += 5;
  }

  yPosition += 3;

  // ========== REPRESENTANTE LEGAL (se houver) ==========
  if (dados.temRepresentanteLegal || dados.nomeRepresentanteLegal) {
    doc.setTextColor(...corTexto);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('REPRESENTANTE LEGAL', margemEsquerda, yPosition);
    yPosition += 7;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');

    const dadosRepresentante = [
      { label: 'Nome do representante:', valor: dados.nomeRepresentanteLegal || 'N/A' },
      { label: 'CPF:', valor: formatarCPF(dados.cpfRepresentanteLegal) },
      { label: 'RG:', valor: dados.rgRepresentanteLegal || 'N/A' },
      { label: 'E-mail:', valor: dados.emailRepresentanteLegal || 'N/A' },
      { label: 'Celular:', valor: formatarTelefone(dados.celularRepresentanteLegal) },
    ];

    for (const dado of dadosRepresentante) {
      doc.setFont(undefined, 'bold');
      doc.text(dado.label, margemEsquerda, yPosition);
      doc.setFont(undefined, 'normal');
      doc.text(dado.valor, margemEsquerda + 50, yPosition);
      yPosition += 5;
    }

    yPosition += 3;
  }

  // ========== NOVO MÉDICO PRESCRITOR (se houver) ==========
  if (dados.temNovoMedicoPrescritor || dados.nomeMedico) {
    doc.setTextColor(...corTexto);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('NOVO MÉDICO PRESCRITOR', margemEsquerda, yPosition);
    yPosition += 7;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');

    const dadosMedico = [
      { label: 'Nome do Médico:', valor: dados.nomeMedico || 'N/A' },
      { label: 'CRM do Médico:', valor: dados.crmMedico || 'N/A' },
      { label: 'E-mail do Médico:', valor: dados.emailMedico || 'N/A' },
      { label: 'Celular do Médico:', valor: formatarTelefone(dados.celularMedico) },
      { label: 'Especialidade do Médico:', valor: dados.especialidadeMedico || 'N/A' },
    ];

    for (const dado of dadosMedico) {
      doc.setFont(undefined, 'bold');
      doc.text(dado.label, margemEsquerda, yPosition);
      doc.setFont(undefined, 'normal');
      doc.text(dado.valor, margemEsquerda + 50, yPosition);
      yPosition += 5;
    }

    yPosition += 3;
  }

  // Verifica se precisa de nova página para os produtos
  if (yPosition > 200) {
    doc.addPage();
    yPosition = 20;
  }

  // ========== PRODUTOS ==========
  if (dados.produtos && dados.produtos.length > 0) {
    // Linha divisória
    doc.setDrawColor(...corLinha);
    doc.setLineWidth(0.5);
    doc.line(margemEsquerda, yPosition, pageWidth - margemDireita, yPosition);
    yPosition += 8;

    doc.setTextColor(...corTexto);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('PRODUTOS SOLICITADOS', margemEsquerda, yPosition);
    yPosition += 8;

    // Cabeçalho da tabela
    doc.setFillColor(...corSecundaria);
    doc.setTextColor(...corBranco);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');

    const colunaProduto = margemEsquerda;
    const colunaQuantidade = margemEsquerda + 90;
    const colunaValor = margemEsquerda + 120;

    // Retângulo do cabeçalho
    doc.rect(margemEsquerda, yPosition - 5, larguraPagina, 7, 'F');

    doc.text('Produto', colunaProduto + 2, yPosition);
    doc.text('Qtd', colunaQuantidade + 2, yPosition);
    doc.text('Valor Unit.', colunaValor + 2, yPosition);

    yPosition += 8;

    // Dados dos produtos
    doc.setTextColor(...corTexto);
    doc.setFont(undefined, 'normal');

    for (const produto of dados.produtos) {
      // Fundo alternado para melhor leitura
      if (dados.produtos.indexOf(produto) % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(margemEsquerda, yPosition - 4, larguraPagina, 6, 'F');
      }

      doc.text(produto.nome || 'Produto sem nome', colunaProduto + 2, yPosition);
      doc.text(`${produto.quantidade || 0}`, colunaQuantidade + 2, yPosition);
      doc.text(`R$ ${parseFloat(produto.valor || 0).toFixed(2)}`, colunaValor + 2, yPosition);
      yPosition += 6;
    }

    // Total
    yPosition += 2;
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...corPrincipal);
    doc.setFontSize(10);
    doc.text('TOTAL:', colunaQuantidade + 2, yPosition);
    doc.text(`R$ ${parseFloat(dados.totalCompra || 0).toFixed(2)}`, colunaValor + 2, yPosition);

    doc.setTextColor(...corTexto);
    yPosition += 8;
  }

  // Verifica se precisa de nova página para as informações finais
  if (yPosition > 220) {
    doc.addPage();
    yPosition = 20;
  }

  // ========== INFORMAÇÕES DE ENDEREÇO E PAGAMENTO ==========
  // Linha divisória
  doc.setDrawColor(...corLinha);
  doc.setLineWidth(0.5);
  doc.line(margemEsquerda, yPosition, pageWidth - margemDireita, yPosition);
  yPosition += 8;

  doc.setTextColor(...corTexto);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('ENDEREÇO DE ENTREGA', margemEsquerda, yPosition);
  yPosition += 7;

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');

  const endereco = [
    { label: 'Rua:', valor: dados.rua || 'N/A' },
    { label: 'Bairro:', valor: dados.bairro || 'N/A' },
    { label: 'Cidade:', valor: dados.cidade || 'N/A' },
    { label: 'Estado:', valor: dados.estado || 'N/A' },
    { label: 'CEP:', valor: formatarCEP(dados.cep) },
    { label: 'País:', valor: dados.pais || 'Brasil' },
  ];

  for (const dado of endereco) {
    doc.setFont(undefined, 'bold');
    doc.text(dado.label, margemEsquerda, yPosition);
    doc.setFont(undefined, 'normal');
    doc.text(dado.valor, margemEsquerda + 50, yPosition);
    yPosition += 5;
  }

  yPosition += 5;

  // ========== INFORMAÇÕES DE PAGAMENTO ==========
  doc.setTextColor(...corTexto);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('INFORMAÇÕES DE PAGAMENTO', margemEsquerda, yPosition);
  yPosition += 7;

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');

  const pagamento = [
    { label: 'Forma de pagamento:', valor: dados.formaPagamento || 'N/A' },
    { label: 'Termos e condições de pagamento:', valor: dados.termosCondicoesPagamento || 'N/A' },
  ];

  for (const dado of pagamento) {
    doc.setFont(undefined, 'bold');
    doc.text(dado.label, margemEsquerda, yPosition);
    doc.setFont(undefined, 'normal');
    
    // text com quebra de linha se necessário
    const linhas = doc.splitTextToSize(dado.valor, larguraPagina - 50);
    doc.text(linhas, margemEsquerda + 50, yPosition);
    yPosition += linhas.length * 4 + 2;
  }

  // ========== OBSERVAÇÕES ==========
  if (dados.observacao) {
    yPosition += 3;
    doc.setTextColor(...corTexto);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('OBSERVAÇÕES', margemEsquerda, yPosition);
    yPosition += 6;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    const linhasObs = doc.splitTextToSize(dados.observacao, larguraPagina - 4);
    doc.text(linhasObs, margemEsquerda + 2, yPosition);
    yPosition += linhasObs.length * 4 + 3;
  }

  // ========== RODAPÉ ==========
  const alturaPagina = pageHeight;
  let yRodape = alturaPagina - 25;

  // Linha divisória do rodapé
  doc.setDrawColor(...corLinha);
  doc.setLineWidth(0.5);
  doc.line(margemEsquerda, yRodape, pageWidth - margemDireita, yRodape);
  yRodape += 6;

  doc.setFontSize(8);
  doc.setTextColor(...corTextoClaro);
  doc.setFont(undefined, 'normal');

  doc.text('Este é um comprovante autossercado. Para confirmar a solicitação, consulte o portal.', margemEsquerda, yRodape);

  const dataGeracao = new Date().toLocaleString('pt-BR');
  doc.text(`Gerado em: ${dataGeracao}`, margemEsquerda, yRodape + 4);

  // Número de página
  const totalPages = doc.internal.pages.length - 1;
  if (totalPages > 1) {
    doc.text(`Página 1 de ${totalPages}`, pageWidth - margemDireita - 20, yRodape + 4);
  }

  // ========== DOWNLOAD ==========
  const tipoFormatado = dados.tipoSolicitacao.replace(/\s+/g, '_');
  const nomeArquivo = `${tipoFormatado}_${numeroProtocolo}.pdf`;
  doc.save(nomeArquivo);
};

/**
 * Formata uma data com hora para o padrão brasileiro
 */
function formatarDataComHora(data) {
  if (!data) return 'Data não disponível';

  try {
    const dataObj = typeof data === 'string' ? new Date(data) : data;
    if (isNaN(dataObj.getTime())) return 'Data inválida';

    const dia = String(dataObj.getDate()).padStart(2, '0');
    const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
    const ano = dataObj.getFullYear();
    const horas = String(dataObj.getHours()).padStart(2, '0');
    const minutos = String(dataObj.getMinutes()).padStart(2, '0');

    return `${dia}/${mes}/${ano} às ${horas}:${minutos}`;
  } catch {
    return 'Data inválida';
  }
}

/**
 * Formata uma data para o padrão brasileiro
 */
function formatarDataBR(data) {
  if (!data) return 'N/A';

  try {
    const dataObj = typeof data === 'string' ? new Date(data) : data;
    if (isNaN(dataObj.getTime())) return 'Data inválida';

    return dataObj.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return 'Data inválida';
  }
}

/**
 * Formata CPF
 */
function formatarCPF(cpf) {
  if (!cpf) return 'N/A';
  const cpfLimpo = cpf.replace(/\D/g, '');
  if (cpfLimpo.length !== 11) return cpf;
  return `${cpfLimpo.substring(0, 3)}.${cpfLimpo.substring(3, 6)}.${cpfLimpo.substring(6, 9)}-${cpfLimpo.substring(9)}`;
}

/**
 * Formata CEP
 */
function formatarCEP(cep) {
  if (!cep) return 'N/A';
  const cepLimpo = cep.replace(/\D/g, '');
  if (cepLimpo.length !== 8) return cep;
  return `${cepLimpo.substring(0, 5)}-${cepLimpo.substring(5)}`;
}

/**
 * Formata telefone/celular
 */
function formatarTelefone(telefone) {
  if (!telefone) return 'N/A';
  const telLimpo = telefone.replace(/\D/g, '');
  if (telLimpo.length === 11) {
    return `(${telLimpo.substring(0, 2)}) ${telLimpo.substring(2, 7)}-${telLimpo.substring(7)}`;
  }
  if (telLimpo.length === 10) {
    return `(${telLimpo.substring(0, 2)}) ${telLimpo.substring(2, 6)}-${telLimpo.substring(6)}`;
  }
  return telefone;
}
