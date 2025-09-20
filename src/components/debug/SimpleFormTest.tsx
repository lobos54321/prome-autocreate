import { useState } from 'react';

export default function SimpleFormTest() {
  const [clickCount, setClickCount] = useState(0);
  const [formSubmitCount, setFormSubmitCount] = useState(0);

  const handleButtonClick = () => {
    console.log('🖱️ 按钮点击测试');
    setClickCount(prev => prev + 1);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📝 表单提交测试');
    setFormSubmitCount(prev => prev + 1);
  };

  return (
    <div style={{ padding: '20px', border: '2px solid red', margin: '20px' }}>
      <h2>🔧 简单表单测试</h2>
      <p>按钮点击次数: {clickCount}</p>
      <p>表单提交次数: {formSubmitCount}</p>
      
      <form onSubmit={handleFormSubmit}>
        <input type="text" placeholder="测试输入" defaultValue="test" />
        <br /><br />
        
        <button type="button" onClick={handleButtonClick} style={{ 
          padding: '10px 20px', 
          backgroundColor: '#8B5CF6', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          margin: '5px'
        }}>
          测试按钮点击
        </button>
        
        <button type="submit" style={{ 
          padding: '10px 20px', 
          backgroundColor: '#10B981', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          margin: '5px'
        }}>
          测试表单提交
        </button>
      </form>
    </div>
  );
}