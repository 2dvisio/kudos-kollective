import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Heart, LogOut, LayoutDashboard, Plus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <header className="border-b border-border bg-card">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Heart className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg text-foreground">Kudos</span>
        </button>

        <nav className="flex items-center gap-2">
          <Button
            variant={location.pathname === '/' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => navigate('/')}
          >
            <LayoutDashboard className="w-4 h-4 mr-1" />
            Dashboard
          </Button>
          <Button
            variant={location.pathname === '/new' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => navigate('/new')}
          >
            <Plus className="w-4 h-4 mr-1" />
            New Request
          </Button>

          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
            <Avatar className="w-7 h-7">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {user?.user_metadata?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-8 w-8">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
