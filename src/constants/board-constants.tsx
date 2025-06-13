import { 
	Briefcase, Target, CheckSquare, Calendar, BarChart, TrendingUp, Lightbulb, Star, Flag, Award, Zap, Heart, Book, Music, Camera, Coffee, Gamepad2, Plane, Car, ShoppingBag, Dumbbell, Utensils, Laptop, Phone, Mail, MessageCircle, Clock, Gift, Shield, Key, Eye, Search, Globe, Map, Compass, Sun, Moon, Cloud, Droplets, Building, Home, School, Hospital, Store, Factory, Wifi, Battery, Headphones, Mic, Monitor, Printer, Mouse, Keyboard, Puzzle, Smile, Flower, Trees, Leaf, Apple, Banana
} from 'lucide-react';

export const BOARD_ICONS = [
	{ name: 'Briefcase', component: Briefcase },
	{ name: 'Target', component: Target },
	{ name: 'CheckSquare', component: CheckSquare },
	{ name: 'Calendar', component: Calendar },
	{ name: 'BarChart', component: BarChart },
	{ name: 'TrendingUp', component: TrendingUp },
	{ name: 'Lightbulb', component: Lightbulb },
	{ name: 'Star', component: Star },
	{ name: 'Flag', component: Flag },
	{ name: 'Award', component: Award },
	{ name: 'Zap', component: Zap },
	{ name: 'Heart', component: Heart },
	{ name: 'Book', component: Book },
	{ name: 'Music', component: Music },
	{ name: 'Camera', component: Camera },
	{ name: 'Coffee', component: Coffee },
	{ name: 'Gamepad2', component: Gamepad2 },
	{ name: 'Plane', component: Plane },
	{ name: 'Car', component: Car },
	{ name: 'ShoppingBag', component: ShoppingBag },
	{ name: 'Dumbbell', component: Dumbbell },
	{ name: 'Utensils', component: Utensils },
	{ name: 'Laptop', component: Laptop },
	{ name: 'Phone', component: Phone },
	{ name: 'Mail', component: Mail },
	{ name: 'MessageCircle', component: MessageCircle },
	{ name: 'Clock', component: Clock },
	{ name: 'Gift', component: Gift },
	{ name: 'Shield', component: Shield },
	{ name: 'Key', component: Key },
	{ name: 'Eye', component: Eye },
	{ name: 'Search', component: Search },
	{ name: 'Globe', component: Globe },
	{ name: 'Map', component: Map },
	{ name: 'Compass', component: Compass },
	{ name: 'Sun', component: Sun },
	{ name: 'Moon', component: Moon },
	{ name: 'Cloud', component: Cloud },
	{ name: 'Droplets', component: Droplets },
	{ name: 'Building', component: Building },
	{ name: 'Home', component: Home },
	{ name: 'School', component: School },
	{ name: 'Hospital', component: Hospital },
	{ name: 'Store', component: Store },
	{ name: 'Factory', component: Factory },
	{ name: 'Wifi', component: Wifi },
	{ name: 'Battery', component: Battery },
	{ name: 'Headphones', component: Headphones },
	{ name: 'Mic', component: Mic },
	{ name: 'Monitor', component: Monitor },
	{ name: 'Printer', component: Printer },
	{ name: 'Mouse', component: Mouse },
	{ name: 'Keyboard', component: Keyboard },
	{ name: 'Puzzle', component: Puzzle },
	{ name: 'Smile', component: Smile },
	{ name: 'Flower', component: Flower },
	{ name: 'Trees', component: Trees },
	{ name: 'Leaf', component: Leaf },
	{ name: 'Apple', component: Apple },
	{ name: 'Banana', component: Banana },
];

export const renderIcon = (iconName: string | undefined, className: string = "h-4 w-4") => {
	if (!iconName) {
		return <Briefcase className={className} />;
	}
	
	const iconData = BOARD_ICONS.find(icon => icon.name === iconName);
	if (iconData) {
		const IconComponent = iconData.component;
		return <IconComponent className={className} />;
	}
	
	// Fallback to Briefcase icon
	return <Briefcase className={className} />;
}; 