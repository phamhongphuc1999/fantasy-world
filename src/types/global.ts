export interface TSiteMetadata {
  title: string;
  description: string;
  url: string;
  siteName: string;
  twitterHandle: string;
  icon: string;
  image: string;
  keywords: string;
}

export type TBaseChartData = {
  width?: number;
  height?: number;
};

export type TPieChartData = {
  label: string;
  value: number;
  color: string;
};

export type TBarChartData = {
  label: string;
  value: number;
  color: string;
};
