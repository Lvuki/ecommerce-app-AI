import API_BASE_URL from '../config';
import { getToken } from './authService';

const BLOG_KEY = 'blog_posts_v1';

function read() {
  try {
    return JSON.parse(localStorage.getItem(BLOG_KEY) || 'null');
  } catch (e) {
    return null;
  }
}

function write(posts) {
  localStorage.setItem(BLOG_KEY, JSON.stringify(posts));
  try { window.dispatchEvent(new Event('storage')); } catch (_) {}
}

function seedIfNeeded() {
  let posts = read();
  if (!posts) {
    posts = [
      {
        id: 1,
        title: 'Introducing ShopApp: Simple, Fast Shopping',
        excerpt: 'ShopApp aims to make small e-commerce demos easy to build and extend. Learn how we designed our product listing and cart flows.',
        content: 'ShopApp is a starter project demonstrating a minimal full-stack shopping application. It includes products, categories, a cart, and an admin UI for managing products. This blog post introduces the project goals and how to extend it.',
        category: 'Announcements',
        image: 'https://picsum.photos/seed/blog1/800/400',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
      },
      {
        id: 2,
        title: '5 Tips to Improve Product Images',
        excerpt: 'Great images increase conversions. Here are five quick tips you can apply today.',
        content: 'Use consistent aspect ratios, good lighting, simple backgrounds, multiple angles, and optimized file sizes to improve perceived quality and load times.',
        category: 'Tips',
        image: 'https://picsum.photos/seed/blog2/800/400',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
      },
      {
        id: 3,
        title: 'How We Seed Sample Products',
        excerpt: 'Automated seeding helps when setting up your development environment. This post shows how we seed products programmatically.',
        content: 'In server startup we check product count and bulkCreate sample products if empty. You can replace the seeder with real data imports.',
        category: 'Development',
        image: 'https://picsum.photos/seed/blog3/800/400',
        createdAt: Date.now() - 1000 * 60 * 60 * 24,
      }
    ];
    write(posts);
  }
}

seedIfNeeded();

export async function getPosts() {
  const res = await fetch(`${API_BASE_URL}/blogs`);
  return res.json();
}

export async function getPostById(id) {
  const res = await fetch(`${API_BASE_URL}/blogs/${id}`);
  return res.json();
}

export async function addPost(formData) {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/blogs`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });
  return res.json();
}

export async function updatePost(id, formData) {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/blogs/${id}`, {
    method: 'PUT',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });
  return res.json();
}

export async function deletePost(id) {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/blogs/${id}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return res.json();
}

export default { getPosts, getPostById, addPost, updatePost, deletePost };
