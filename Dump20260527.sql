CREATE DATABASE  IF NOT EXISTS `ecommerce` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `ecommerce`;
-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: ecommerce
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `product_id` int NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `quantity` int NOT NULL,
  `price_at_time` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  KEY `idx_order_items_order_id` (`order_id`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
INSERT INTO `order_items` VALUES (1,1,1,'Apple iPhone 17 Pro Max',1,1199.00),(2,2,1,'Apple iPhone 17 Pro Max',1,1199.00),(3,3,1,'Apple iPhone 17 Pro Max',2,1199.00),(4,3,2,'Samsung Galaxy S26 Ultra',1,1299.00),(5,3,3,'7Hz Salnotes Zero 2',3,20.00),(6,3,4,'Truthear GATe',2,25.00),(7,3,5,'DRY-EX UV Protection Full-Zip Hoodie',5,20.00),(8,4,3,'7Hz Salnotes Zero 2',1,20.00),(9,5,1,'Apple iPhone 17 Pro Max',1,1199.00),(10,5,3,'7Hz Salnotes Zero 2',1,20.00),(11,6,1,'Apple iPhone 17 Pro Max',1,1199.00),(12,7,1,'Apple iPhone 17 Pro Max',4,1199.00),(13,8,2,'Samsung Galaxy S26 Ultra',3,1299.00),(14,8,4,'Truthear GATe',3,25.00),(15,8,5,'DRY-EX UV Protection Full-Zip Hoodie',3,20.00),(16,9,2,'Samsung Galaxy S26 Ultra',1,1299.00);
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `customer_email` varchar(255) DEFAULT NULL,
  `order_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `delivery_date` date DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_orders_user_id` (`user_id`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (1,1,'Andrei Profeta','andreiprofeta@gmail.com','2026-05-24 17:41:48','2026-05-31',1199.00),(2,1,'Andrei Profeta','andreiprofeta@gmail.com','2026-05-24 17:42:29','2026-05-31',1199.00),(3,1,'Andrei Profeta','andreiprofeta@gmail.com','2026-05-24 18:19:50','2026-05-31',3907.00),(4,1,'Andrei Profeta','andreiprofeta@gmail.com','2026-05-25 11:17:50','2026-06-01',20.00),(5,2,'tae','tae@gmail.com','2026-05-26 09:34:14','2026-06-02',1219.00),(6,2,'tae','tae@gmail.com','2026-05-26 09:36:23','2026-06-02',1199.00),(7,2,'tae','tae@gmail.com','2026-05-26 09:36:33','2026-06-02',4796.00),(8,3,'Nyx Quinn Martines ','nyxquinnmartines@gmail.com','2026-05-26 11:22:23','2026-06-02',4032.00),(9,5,'prince','princeatgeemale','2026-05-26 15:30:20','2026-06-02',1299.00);
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `stock` int NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,'Apple iPhone 17 Pro Max',1199.00,20,'Smartphone','/uploads/1779688041584-334320474.png'),(2,'Samsung Galaxy S26 Ultra',1299.00,10,'Smartphone','/uploads/1779688117229-684814864.jpg'),(3,'7Hz Salnotes Zero 2',20.00,15,'In-Ear Monitors','/uploads/1779646700478-855430541.png'),(4,'Truthear GATe',25.00,20,'In-Ear Monitors','/uploads/1779646718220-819015894.jpg'),(5,'DRY-EX UV Protection Full-Zip Hoodie',20.00,22,'Clothing','/uploads/1779688205357-229825869.jpg');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_cart`
--

DROP TABLE IF EXISTS `user_cart`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_cart` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int NOT NULL,
  `added_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_product` (`user_id`,`product_id`),
  KEY `product_id` (`product_id`),
  KEY `idx_user_cart_user_id` (`user_id`),
  CONSTRAINT `user_cart_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_cart_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=116 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_cart`
--

LOCK TABLES `user_cart` WRITE;
/*!40000 ALTER TABLE `user_cart` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_cart` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `birthdate` date DEFAULT NULL,
  `address` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'andreiprofeta@gmail.com','$2b$10$/jNSmKLc3gDdeBeItFu39e5SG3ixcIVDu2EoVABoeKzuraIZfAZk6','Andrei Profeta','2005-02-08','B8 L62 P3 St. Cattleya Maryhomes Subd. Bacoor Cavite','2026-05-24 17:40:54'),(2,'clarimondekenmolas@gmail.com','$2b$10$Z6tu6pVgYMauG3Vq1AhFwuoY5s./j25Ar3qG4oMoILWjvEEclWK6W','Clarimonde Ken Molas',NULL,'epstein island','2026-05-26 09:33:23'),(3,'nyxquinnmartines@gmail.com','$2b$10$KXcAbmsukBYUC0WwwcTrTuRHDbQwHaSi9WpHb2vn/tHrwzmkY.Y/e','Nyx Quinn Martines ','2004-12-02','Sa bahay namin','2026-05-26 11:20:23'),(4,'sethrillo2316@gmail.com','$2b$10$LpLL43sRMd5S9mXwMbRRHuRvRwiLFP5EemNwe7X2c/3dZ81Ejt3B6','Seth Avery Arias Rillo','2005-11-16','Blk 21-A Lot 26 Golden Shower st. Central Phase 3 Left Wing Camella Springville, Molino 3','2026-05-26 14:05:37'),(5,'princeatgeemale','$2b$10$fohx/hSXAtZboTIgzxedX.X2sgTd5auIOoVxyM/qZHBkkAzj18wVW','prince','2000-08-22','malaki street, bayag highschool','2026-05-26 15:29:16');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-27 13:30:47
