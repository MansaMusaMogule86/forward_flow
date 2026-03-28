import youngBlackSupport from "@/assets/images/community/youth-support.jpg";
import youngBlackLearning from "@/assets/images/community/youth-learning.jpg";
import youngBlackSuccess from "@/assets/images/community/youth-success.jpg";

export const PathwayVisual = ({ pathway }: { pathway: string }) => {
  const getImage = () => {
    switch (pathway) {
      case "community":
        return youngBlackSupport;
      case "learning": 
        return youngBlackLearning;
      case "success":
        return youngBlackSuccess;
      default:
        return youngBlackLearning;
    }
  };

  const getAlt = () => {
    switch (pathway) {
      case "community":
        return "Young Black adults in supportive community circle";
      case "learning":
        return "Young Black adults learning together in modern educational environment";
      case "success":
        return "Professional portraits of successful young Black adults";
      default:
        return "Young Black learning community";
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl shadow-2xl">
      <img 
        src={getImage()} 
        alt={getAlt()}
        className="w-full h-80 object-cover transition-transform duration-300 md:hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-osu-scarlet/30 via-transparent to-transparent" />
    </div>
  );
};